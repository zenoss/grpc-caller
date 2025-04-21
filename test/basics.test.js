const test = require('ava')
const path = require('path')
const async = require('async')
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

const caller = require('../')

const PROTO_PATH = path.resolve(__dirname, './protos/helloworld.proto')

const packageDefinition = protoLoader.loadSync(PROTO_PATH)
const helloproto = grpc.loadPackageDefinition(packageDefinition).helloworld

const apps = []

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getHost (port) {
  return '0.0.0.0:'.concat(port || getRandomInt(1000, 60000))
}

const STATIC_HOST = getHost()
const DYNAMIC_HOST = getHost()

test.before('should dynamically create service', t => {
  function sayHello (call, callback) {
    callback(null, { message: 'Hello ' + call.request.name })
  }

  const server = new grpc.Server()
  server.addService(helloproto.Greeter.service, { sayHello: sayHello })
  server.bindAsync(DYNAMIC_HOST, grpc.ServerCredentials.createInsecure(), err => {
    t.falsy(err)
    apps.push(server)
  })
})

test.before('should statically create service', t => {
  const messages = require('./static/helloworld_pb')
  const services = require('./static/helloworld_grpc_pb')

  function sayHello (call, callback) {
    const reply = new messages.HelloReply()
    reply.setMessage('Hello ' + call.request.getName())
    callback(null, reply)
  }

  const server = new grpc.Server()
  server.addService(services.GreeterService, { sayHello: sayHello })
  server.bindAsync(STATIC_HOST, grpc.ServerCredentials.createInsecure(), err => {
    t.falsy(err)
    apps.push(server)
  })
})

test('call dynamic service using callback', t => {
  t.plan(4)
  const client = caller(DYNAMIC_HOST, PROTO_PATH, 'Greeter')
  return new Promise((resolve, reject) => {
    client.sayHello({ name: 'Bob' }, (err, response) => {
      if (err) {
        t.falsy(err) // This will fail if there's an error, but we still want to check it
        reject(err)
        return
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hello Bob')
      resolve()
    })
  })
})

test('call dynamic service using callback created using package', t => {
  t.plan(4)
  const client = caller(DYNAMIC_HOST, PROTO_PATH, 'helloworld.Greeter')
  return new Promise((resolve, reject) => {
    client.sayHello({ name: 'Bob' }, (err, response) => {
      if (err) {
        t.falsy(err) // This will fail if there's an error, but we still want to check it
        reject(err)
        return
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hello Bob')
      resolve()
    })
  })
})

test('call dynamic service using callback and load options', t => {
  t.plan(4)
  const client = caller(DYNAMIC_HOST, { load: {}, file: PROTO_PATH }, 'Greeter')
  return new Promise((resolve, reject) => {
    client.sayHello({ name: 'Root' }, (err, response) => {
      if (err) {
        t.falsy(err) // This will fail if there's an error, but we still want to check it
        reject(err)
        return
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hello Root')
      resolve()
    })
  })
})

test('call static service using callback', t => {
  t.plan(5)

  const messages = require('./static/helloworld_pb')
  const services = require('./static/helloworld_grpc_pb')

  const client = caller(STATIC_HOST, services.GreeterClient)

  const request = new messages.HelloRequest()
  request.setName('Jane')
  return new Promise((resolve, reject) => {
    client.sayHello(request, (err, response) => {
      if (err) {
        t.falsy(err) // This will fail if there's an error, but we still want to check it
        reject(err)
        return
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.getMessage)
      const msg = response.getMessage()
      t.truthy(msg)
      t.is(msg, 'Hello Jane')
      resolve()
    })
  })
})

test('call dynamic service using async', async t => {
  t.plan(3)
  const client = caller(DYNAMIC_HOST, PROTO_PATH, 'Greeter')
  const response = await client.sayHello({ name: 'Bob' })
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hello Bob')
})

test('call dynamic service using async and load options', async t => {
  t.plan(3)
  const client = caller(DYNAMIC_HOST, { load: {}, file: PROTO_PATH }, 'Greeter')
  const response = await client.sayHello({ name: 'Root' })
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hello Root')
})

test('call static service using async', async t => {
  t.plan(4)

  const messages = require('./static/helloworld_pb')
  const services = require('./static/helloworld_grpc_pb')

  const client = caller(STATIC_HOST, services.GreeterClient)

  const request = new messages.HelloRequest()
  request.setName('Jane')
  const response = await client.sayHello(request)
  t.truthy(response)
  t.truthy(response.getMessage)
  const msg = response.getMessage()
  t.truthy(msg)
  t.is(msg, 'Hello Jane')
})

test.after.always('guaranteed cleanup', t => {
  async.each(apps, (app, ascb) => app.tryShutdown(ascb), t.end)
})
