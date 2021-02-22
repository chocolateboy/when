'use strict';

const test    = require('ava')
const Emitter = require('events')
const when    = require('..')

test.cb('before', t => {
    t.plan(2)

    let called = 0

    const emitter = new Emitter()
    const onReady = when(done => emitter.once('ready', done))

    const listener = value => {
        t.is(value, 42)

        if (++called === 2) {
            t.end()
        }
    }

    onReady(listener)
    onReady(listener)
    emitter.emit('ready', 42)
})

test.cb('after', t => {
    t.plan(2)

    let called = 0

    const emitter = new Emitter()
    const onReady = when(done => emitter.once('ready', done))

    const listener = value => {
        t.is(value, 42)

        if (++called === 2) {
            t.end()
        }
    }

    emitter.emit('ready', 42)
    onReady(listener)
    onReady(listener)
})

test.cb('around', t => {
    t.plan(2)

    let called = 0

    const emitter = new Emitter()
    const onReady = when(done => emitter.once('ready', done))

    const listener = value => {
        t.is(value, 42)

        if (++called === 2) {
            t.end()
        }
    }

    onReady(listener)
    emitter.emit('ready', 42)
    onReady(listener)
})

test('promise', async t => {
    let called = 0

    const emitter = new Emitter()
    const onReady = when(done => emitter.once('ready', done))

    const listener = value => {
        t.deepEqual(value, ['foo', 42])
        ++called
        return value
    }

    const p1 = onReady().then(listener)

    emitter.emit('ready', 'foo', 42)

    const p2 = onReady().then(listener)
    const result = await Promise.all([p1, p2])

    t.is(called, 2)
    t.deepEqual(result, [['foo', 42], ['foo', 42]])
})

test.cb('this + args', t => {
    let called = 0, emit

    const $this = { foo: 42 }
    const got = {}
    const want = {
        result1: [$this, 'foo', 42],
        result2: [undefined, ['foo', 42]],
    }

    const checkDone = () => {
        if (++called === 2) {
            t.deepEqual(got, want)
            t.end()
        }
    }

    const onReady = when(done => emit = done)

    const listener1 = function (...args) {
        got.result1 = [this, ...args]
        checkDone()
    }

    const listener2 = function (...args) {
        got.result2 = [this, ...args]
        checkDone()
    }

    onReady(listener1)
    emit.call($this, 'foo', 42)
    onReady().then(listener2)
})

test.cb('unsubscribe', t => {
    t.plan(3)

    let called = 0

    const checkDone = () => {
        if (++called === 2) {
            t.end()
        }
    }

    const emitter = new Emitter()
    const onReady = when(done => emitter.once('ready', done))
    const unsubscribe1 = onReady(() => t.fail())
    const unsubscribe2 = onReady(() => {
        t.pass()
        checkDone()
    })

    t.is(unsubscribe1(), true)
    emitter.emit('ready')
    t.is(unsubscribe2(), false)
    checkDone()
})

test.cb('once', t => {
    t.plan(2)

    let called = 0

    const emitter = new Emitter()
    const onReady = when(done => emitter.on('value', done))
    const results = []

    const listener = value => {
        t.is(value, 1)

        if (++called === 2) {
            t.end()
        }
    }

    onReady(listener)

    for (let i = 1; i <= 100; ++i) {
        emitter.emit('value', i)
    }

    onReady(listener)
})

test.cb('error handling', t => {
    t.plan(8)

    let called = 0

    const seen = {}
    const emitter = new Emitter()
    const onReady = when(
        done => emitter.once('ready', done),
        error => {
            t.assert(error instanceof Error)
            t.is(error.message, 'Test')
            t.is(error.value, 42)

            if (++called === 2) {
                t.end()
            }
        }
    )

    const listener = value => {
        t.is(value, 42)
        throw Object.assign(new Error('Test'), { value })
    }

    onReady(listener)
    emitter.emit('ready', 42)
    onReady(listener)
})

test('type checks', t => {
    let error

    const emitter = new Emitter()
    const callback = done => emitter.once('ready', done)
    const foo = null
    const bar = ['bar']
    const baz = { baz: 'baz' }

    error = t.throws(() => when(foo), {
        instanceOf: TypeError,
        message: /\binvalid callback\b/i,
    })

    t.is(error.value, foo)

    error = t.throws(() => when(callback, bar), {
        instanceOf: TypeError,
        message: /\binvalid error handler\b/i,
    })

    t.is(error.value, bar)

    const onReady = when(callback)

    error = t.throws(() => onReady(baz), {
        instanceOf: TypeError,
        message: /\binvalid listener\b/i,
    })

    t.is(error.value, baz)
})
