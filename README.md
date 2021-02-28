# when

[![Build Status](https://github.com/chocolateboy/when/workflows/test/badge.svg)](https://github.com/chocolateboy/when/actions?query=workflow%3Atest)
[![NPM Version](https://img.shields.io/npm/v/@chocolatey/when.svg)](https://www.npmjs.org/package/@chocolatey/when)

<!-- TOC -->

- [NAME](#name)
- [FEATURES](#features)
- [INSTALLATION](#installation)
- [SYNOPSIS](#synopsis)
- [DESCRIPTION](#description)
  - [Why?](#why)
  - [Why not?](#why-not)
- [TYPES](#types)
- [EXPORTS](#exports)
  - [default](#default)
- [DEVELOPMENT](#development)
- [COMPATIBILITY](#compatibility)
- [SEE ALSO](#see-also)
- [VERSION](#version)
- [AUTHOR](#author)
- [COPYRIGHT AND LICENSE](#copyright-and-license)

<!-- TOC END -->

# NAME

when - subscribe to an event before or after it's fired

# FEATURES

- no dependencies
- &lt; 500 B minified + gzipped
- fully typed (TypeScript)
- CDN builds (UMD) - [jsDelivr][], [unpkg][]

# INSTALLATION

    $ npm install @chocolatey/when

# SYNOPSIS

```javascript
import when from '@chocolatey/when'

const onPageShow = when(done => {
    window.addEventListener('pageshow', done)
})

// callback
onPageShow(event => addWidget(user))

// promise
onPageShow().then(([event]) => addWidget(user))
```

# DESCRIPTION

`when` provides a way to register listeners for a function call before or after
the function is called. This can be used to "pin" events (or other kinds of
signal/notification) so that they can be consumed after they've fired.

## Why?

Several events and notifications that are exposed as transient, fire-and-forget
messages are better thought of as *states*, e.g. "ready" notifications for
services, or lifecycle events for web pages. They tend to be fired once, and we
often need to detect that they've fired after the fact. This usage is not
supported by most event-emitter implementations, and handling it manually can
involve fiddly imperative code which obscures the simple semantics.

This module exports a function which allows these notifications to be *pinned*
like "sticky" announcements on a message board or forum, rather than the
blink-and-you-miss-it behavior of events, removing the timing-sensitivity that
can make the event-based representation of these states inconvenient to use or
unreliable.

## Why not?

`when` provides a way to pin notifications when a framework or library doesn't
provide a way to do that itself, e.g. when consuming events produced by most
event-emitter implementations. But if you control/emit the notifications
yourself, and want consumers to be able to subscribe to them after they've been
published, this can be handled in the notifier itself, e.g. by using a library
with support for pinned events such as [fixed-event][] or
[ipc-event-emitter][].

# TYPES

The following types are referenced in the descriptions below.

<details>

```typescript
export type Callback = (done: <A extends any[]>(...args: A) => void) => void;
export type ErrorHandler = (error: any) => void;
export type Listener = <A extends any[]>(this: unknown, ...args: A) => void;

export interface Subscribe {
    <A extends any[]>(): Promise<A & { this: unknown }>;
    (listener: Listener): () => boolean;
};
```

</details>

# EXPORTS

## default

- **Type**: `(callback: Callback, onError?: ErrorHandler) => Subscribe`

```javascript
import when from '@chocolatey/when'

const onPageShow = when(done => {
    window.addEventListener('pageshow', done)
})

user.getData(url) // load data if not cached

onPageShow(event => addWidget(user))
```

`when` passes a delegating function to a callback and returns a function which
registers listeners to be called when the delegate is called. Listeners are
passed the same arguments and `this` value as the delegate and are executed
asynchronously. Listeners registered after the delegate has been called are
invoked immediately.

<!-- TOC:ignore -->
### unsubscribe

When the returned function is passed a listener, it returns a function which
can be used to unregister the listener if it hasn't already been called. The
function returns true if the listener was successfully unregistered, or false
otherwise.

```javascript
const unsubscribe = onPageShow(() => addWidget(user))

// ...

if (!user.loggedIn) {
    unsubscribe()
}
```

<!-- TOC:ignore -->
### promise

If the listener is omitted, a promise is returned which is resolved with the
array of arguments passed to the delegate.

```javascript
onPageShow().then(([event]) => addWidget(user))

const [event] = await onPageShow()
```

If the delegate's `this` value is needed inside the `then` function, it can be
accessed via the `this` property on the arguments array:

```javascript
onPageShow().then(args => {
    const [event] = args
    const self = args.this
})

const { 0: event, this: self } = await onPageShow()
```

<!-- TOC:ignore -->
### error handler

`when` takes an optional error-handler which is passed any error which occurs
when a listener is invoked. If not supplied, listener errors are logged with
`console.error`.

```javascript
const onReady = when(
    done => emitter.once('ready', done),
    error => errors.push(error)
)

onReady(() => loadFile(path))
// errors.push(new Error("no such file..."))
```

<!-- TOC:ignore -->
### once

The delegate function records its arguments and `this` value the first time
it's called and subsequent calls are ignored, i.e. it behaves like it's only
called once. This makes it safe to use with events which may be emitted
multiple times, though arranging for the delegate to only be called once can
still be useful to avoid spamming it with redundant calls.

```javascript
const onBeforeUnload = when(done => {
    window.addEventListener('beforeunload', done, { once: true })
})
```

<!-- TOC:ignore -->
### side effects

Note that the delegating function is void, i.e. there's no way to return a
value from it, and no way to return a different value from it each time it's
called (since it's only executed once). There's also no way to perform a side
effect such as stopping the propagation of an event, since listeners are
executed asynchronously. If any of these features are needed, they can be
handled by wrapping the delegate, e.g.

```javascript
const onReady = when(done => {
    const wrapper = function (event) {
        const result = handle(event) // side effects
        done.call(this, event)       // notify listeners (once)
        return result                // return value
    }

    emitter.on('ready', wrapper)
})
```

# DEVELOPMENT

<details>

<!-- TOC:ignore -->
## NPM Scripts

The following NPM scripts are available:

- build - compile the library for testing and save to the target directory
- build:doc - generate the README's TOC (table of contents)
- build:release - compile the library for release and save to the target directory
- clean - remove the target directory and its contents
- rebuild - clean the target directory and recompile the library
- test - recompile the library and run the test suite
- test:run - run the test suite
- typecheck - sanity check the library's type definitions

</details>

# COMPATIBILITY

- [Maintained Node.js versions](https://github.com/nodejs/Release#readme) and compatible browsers

# SEE ALSO

- [fixed-event][] - EventEmitter for one-time tasks
- [ipc-event-emitter][] - an EventEmitter wrapper for IPC between parent and child processes with support for pinned events
- [wl][] - whenable events implementation

# VERSION

1.1.0

# AUTHOR

[chocolateboy](mailto:chocolate@cpan.org)

# COPYRIGHT AND LICENSE

Copyright © 2021 by chocolateboy.

This is free software; you can redistribute it and/or modify it under the
terms of the [Artistic License 2.0](https://www.opensource.org/licenses/artistic-license-2.0.php).

[fixed-event]: https://www.npmjs.com/package/fixed-event
[ipc-event-emitter]: https://www.npmjs.com/package/ipc-event-emitter
[jsDelivr]: https://cdn.jsdelivr.net/npm/@chocolatey/when@1.1.0/dist/index.umd.min.js
[unpkg]: https://unpkg.com/@chocolatey/when@1.1.0/dist/index.umd.min.js
[wl]: https://www.npmjs.com/package/wl
