const _ = require('lodash')
const test = require('ava')
const path = require('path')
const async = require('async')
const grpc = require('@grpc/grpc-js')

const protoLoader = require('@grpc/proto-loader')

const caller = require('../')
const { ref } = require('process')

const PROTO_PATH = path.resolve(__dirname, './protos/reqres.proto')
const packageDefinition = protoLoader.loadSync(PROTO_PATH)
const argProto = grpc.loadPackageDefinition(packageDefinition).argservice

const apps = []

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getHost(port) {
  return '0.0.0.0:'.concat(port || getRandomInt(1000, 60000))
}

const DYNAMIC_HOST = getHost()
const client = caller(DYNAMIC_HOST, PROTO_PATH, 'ArgService')

test.before('should dynamically create service', t => {
  function doSomething(call, callback) {
    const ret = { message: call.request.message }

    const md = new grpc.Metadata()
    md.set('headerMD', 'headerValue')
    call.sendMetadata(md)

    if (call.metadata) {
      const meta = call.metadata.getMap()
      if (meta['user-agent']) {
        delete meta['user-agent']
      }
      if (!_.isEmpty(meta)) {
        ret.metadata = JSON.stringify(meta)
      }
    }

    const md2 = new grpc.Metadata()
    md2.set('trailerMD', 'trailerValue')

    callback(null, ret, md2)
  }

  const server = new grpc.Server()
  server.addService(argProto.ArgService.service, { doSomething })
  server.bindAsync(DYNAMIC_HOST, grpc.ServerCredentials.createInsecure(), err => {
    t.falsy(err)
    apps.push(server)
  })
})

test('call service using callback and just an argument', t => {
  t.plan(5)
  return new Promise((resolve, reject) => {
    client.doSomething({ message: 'Hello' }, (err, response) => {
      if (err) {
        t.fail(err)
        reject(err)
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.message)
      t.falsy(response.metadata)
      t.is(response.message, 'Hello')
      resolve()
    })
  })
})

test('call service using async with just an argument', async t => {
  t.plan(4)
  const response = await client.doSomething({ message: 'Hi' })
  t.truthy(response)
  t.truthy(response.message)
  t.falsy(response.metadata)
  t.is(response.message, 'Hi')
})

test('call service using callback with metadata as plain object', t => {
  t.plan(6)
  const ts = new Date().getTime()
  return new Promise((resolve, reject)=>{
    client.doSomething({ message: 'Hello' }, { requestId: 'bar-123', timestamp: ts }, (err, response) => {
      if (err) {
        t.fail(err.message)
        reject(err)
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hello')
      t.truthy(response.metadata)
      const metadata = JSON.parse(response.metadata)
      const expected = { requestid: 'bar-123', timestamp: ts.toString() }
      t.deepEqual(metadata, expected)
      resolve()
    })
  })
})

test('call service using async with metadata as plain object', async t => {
  t.plan(5)
  const ts = new Date().getTime()
  const response = await client.doSomething({ message: 'Hi' }, { requestId: 'bar-123', timestamp: ts })
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts.toString() }
  t.deepEqual(metadata, expected)
})

test('call service using callback with metadata as Metadata', t => {
  t.plan(6)
  const ts = new Date().getTime().toString()
  const reqMeta = new grpc.Metadata()
  reqMeta.add('requestId', 'bar-123')
  reqMeta.add('timestamp', ts)
  return new Promise((resolve, reject) =>{
    client.doSomething({ message: 'Hello' }, reqMeta, (err, response) => {
      if (err) {
        t.fail(err.message)
        reject(err)
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hello')
      t.truthy(response.metadata)
      const metadata = JSON.parse(response.metadata)
      const expected = { requestid: 'bar-123', timestamp: ts }
      t.deepEqual(metadata, expected)
      resolve()
    })
  })
})

test('call service using async with metadata as Metadata', async t => {
  t.plan(5)
  const ts = new Date().getTime().toString()
  const reqMeta = new grpc.Metadata()
  reqMeta.add('requestId', 'bar-123')
  reqMeta.add('timestamp', ts)
  const response = await client.doSomething({ message: 'Hi' }, reqMeta)
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts }
  t.deepEqual(metadata, expected)
})

test('call service using callback with metadata as plain object and options object', t => {
  t.plan(6)
  const ts = new Date().getTime()
  return new Promise((resolve, reject)=>{
    client.doSomething({ message: 'Hello' }, { requestId: 'bar-123', timestamp: ts }, { some: 'blah' }, (err, response) => {
      if (err) {
        t.fail(err.message)
        reject(err)
      }
      t.falsy(err)
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hello')
      t.truthy(response.metadata)
      const metadata = JSON.parse(response.metadata)
      const expected = { requestid: 'bar-123', timestamp: ts.toString() }
      t.deepEqual(metadata, expected)
      resolve()
    })
  })
})

test('call service using async with metadata as plain object and options object', async t => {
  t.plan(5)
  const ts = new Date().getTime()
  const response = await client.doSomething({ message: 'Hi' }, { requestId: 'bar-123', timestamp: ts }, { some: 'blah' })
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts.toString() }
  t.deepEqual(metadata, expected)
})

test('call service using callback with metadata as Metadata and options object', t => {
  t.plan(5)
  const ts = new Date().getTime().toString()
  return new Promise((resolve, reject) => {
    const reqMeta = new grpc.Metadata()
    reqMeta.add('requestId', 'bar-123')
    reqMeta.add('timestamp', ts)
    client.doSomething({ message: 'Hello' }, reqMeta, { some: 'blah' }, (err, response) => {
      if (err) {
        t.fail(err)
        reject(err)
      }
      t.truthy(response)
     t.truthy(response.message)
      t.is(response.message, 'Hello')
      t.truthy(response.metadata)
      const metadata = JSON.parse(response.metadata)
      const expected = { requestid: 'bar-123', timestamp: ts }
      t.deepEqual(metadata, expected)
      resolve()
    })
  })
})

test('call service using async with metadata as Metadata and options object', async t => {
  t.plan(5)
  const ts = new Date().getTime().toString()
  const reqMeta = new grpc.Metadata()
  reqMeta.add('requestId', 'bar-123')
  reqMeta.add('timestamp', ts)
  const response = await client.doSomething({ message: 'Hi' }, reqMeta, { some: 'blah' })
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts }
  t.deepEqual(metadata, expected)
})

test('Request API: call service using callback and just an argument', t => {
  t.plan(9)
  const req = new client.Request('doSomething', { message: 'Hello' })
  return new Promise((resolve, reject)=>{
    req.exec((err, res) => {
      if (err) {
        t.fail(err.message)
        return reject(err)
      }
      t.falsy(err)
      const { response } = res
      t.truthy(res.response)
      t.truthy(res.call)
      t.falsy(res.metadata)
      t.falsy(res.status)
      t.truthy(response)
      t.truthy(response.message)
      t.falsy(response.metadata)
      t.is(response.message, 'Hello')
      resolve()
    })
  })

})

test('Request API: call service using async with just an argument', async t => {
  t.plan(8)
  const req = new client.Request('doSomething', { message: 'Hi' })
  const res = await req.exec()
  const { response } = res
  t.truthy(res.response)
  t.truthy(res.call)
  t.falsy(res.metadata)
  t.falsy(res.status)
  t.truthy(response)
  t.truthy(response.message)
  t.falsy(response.metadata)
  t.is(response.message, 'Hi')
})

test('Request API: call service using callback with metadata as plain object', t => {
  t.plan(9)
  const ts = new Date().getTime()
  const req = new client.Request('doSomething', { message: 'Hello' })
    .withMetadata({ requestId: 'bar-123', timestamp: ts })

  return new Promise((resolve, reject)=>{
    req.exec((err, res) => {
      if (err) {
        t.fail(err)
        reject(err)
      }
      t.falsy(err)
      const { response } = res
      t.truthy(res.call)
      t.falsy(res.metadata)
      t.falsy(res.status)
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hello')
      t.truthy(response.metadata)
      const metadata = JSON.parse(response.metadata)
      const expected = { requestid: 'bar-123', timestamp: ts.toString() }
      t.deepEqual(metadata, expected)
      resolve()
    })
  })
})

test('Request API: call service using async with metadata as plain object', async t => {
  t.plan(8)
  const ts = new Date().getTime()

  const req = new client.Request('doSomething', { message: 'Hi' })
    .withMetadata({ requestId: 'bar-123', timestamp: ts })

  const res = await req.exec()
  t.truthy(res.call)
  t.falsy(res.metadata)
  t.falsy(res.status)
  const { response } = res
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts.toString() }
  t.deepEqual(metadata, expected)
})

test('Request API: with metadata option', async t => {
  t.plan(9)
  const ts = new Date().getTime()

  const req = new client.Request('doSomething', { message: 'Hi' })
    .withMetadata({ requestId: 'bar-123', timestamp: ts })
    .withResponseMetadata(true)

  const res = await req.exec()
  t.truthy(res.call)
  t.truthy(res.metadata)
  const md1 = res.metadata.getMap()
  const expectedMd = { headermd: 'headerValue' }
  t.is(md1.headermd, expectedMd.headermd)

  t.falsy(res.status)
  const { response } = res
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts.toString() }
  t.deepEqual(metadata, expected)
})

test('Request API: with status option', async t => {
  t.plan(12)
  const ts = new Date().getTime()

  const req = new client.Request('doSomething', { message: 'Hi' })
    .withMetadata({ requestId: 'bar-123', timestamp: ts })
    .withResponseStatus(true)

  const res = await req.exec()
  t.truthy(res.call)
  t.falsy(res.metadata)
  t.truthy(res.status)
  t.is(res.status.code, 0)
  t.is(res.status.details, 'OK')
  t.truthy(res.status.metadata)
  const md1 = res.status.metadata.getMap()
  const expectedMd = { trailermd: 'trailerValue' }
  t.is(md1.headermd, expectedMd.headermd)

  const { response } = res
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts.toString() }
  t.deepEqual(metadata, expected)
})

test('Request API: with metadata and status option', async t => {
  t.plan(12)
  const ts = new Date().getTime()

  const req = new client.Request('doSomething', { message: 'Hi' })
    .withMetadata({ requestId: 'bar-123', timestamp: ts })
    .withResponseMetadata(true)
    .withResponseStatus(true)

  const res = await req.exec()

  t.truthy(res.metadata)
  const md1 = res.metadata.getMap()
  const expectedMd = { headermd: 'headerValue' }
  t.is(md1.headermd, expectedMd.headermd)

  t.truthy(res.status)
  t.is(res.status.code, 0)
  t.is(res.status.details, 'OK')
  t.truthy(res.status.metadata)
  const md2 = res.status.metadata.getMap()
  const expectedMd2 = { trailermd: 'trailerValue' }
  t.deepEqual(md2, expectedMd2)

  const { response } = res
  t.truthy(response)
  t.truthy(response.message)
  t.is(response.message, 'Hi')
  t.truthy(response.metadata)
  const metadata = JSON.parse(response.metadata)
  const expected = { requestid: 'bar-123', timestamp: ts.toString() }
  t.deepEqual(metadata, expected)
})

test('Request API: with metadata and status option with callback', t => {
  t.plan(13)
  const ts = new Date().getTime()

  const req = new client.Request('doSomething', { message: 'Hi' })
    .withMetadata({ requestId: 'bar-123', timestamp: ts })
    .withResponseMetadata(true)
    .withResponseStatus(true)

  return new Promise((resolve, reject)=>{
    req.exec((err, res) => {
      if (err) {
        t.fail(err)
        reject(err)
      }
      t.falsy(err)
      t.truthy(res.metadata)
      const md1 = res.metadata.getMap()
      const expectedMd = { headermd: 'headerValue' }
      t.is(md1.headermd, expectedMd.headermd)

      t.truthy(res.status)
      t.is(res.status.code, 0)
      t.is(res.status.details, 'OK')
      t.truthy(res.status.metadata)
      const md2 = res.status.metadata.getMap()
      const expectedMd2 = { trailermd: 'trailerValue' }
      t.deepEqual(md2, expectedMd2)

      const { response } = res
      t.truthy(response)
      t.truthy(response.message)
      t.is(response.message, 'Hi')
      t.truthy(response.metadata)
      const metadata = JSON.parse(response.metadata)
      const expected = { requestid: 'bar-123', timestamp: ts.toString() }
      t.deepEqual(metadata, expected)
      resolve()
    })
  })
})

test('Request API: expect to throw on unknown client method', t => {
  const error = t.throws(() => {
    const req = new client.Request('asdf', { message: 'Hi' })
      .withMetadata({ requestId: 'bar-123' })
      .withResponseMetadata(true)
      .withResponseStatus(true)

    req.exec()
  })

  t.truthy(error)
  t.is(error.message, 'Invalid method: asdf')
})

test.after.always('guaranteed cleanup', async t => {
  async.each(apps, (app, ascb) => app.tryShutdown(ascb), t.end)
})
