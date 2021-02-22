export type Callback = (done: <A extends any[]>(...args: A) => void) => void;
export type ErrorHandler = (error: any) => void;
export type Listener = <A extends any[]>(this: unknown, ...args: A) => void;

export interface Subscribe {
    <A extends any[]>(): Promise<A>;
    (listener: Listener): () => boolean;
};

/*
 * a default key which is guaranteed to *not* be found in the listeners map
 * (Map<symbol, Listener>)
 *
 * used to look up a listener (and fail) when the delegating function has
 * already been executed, or when an internal listener is generated (for
 * promises)
 */
const DUMMY_KEY = Symbol()

/*
 * execute a listener non-synchronously (in a microtask)
 */
const defer = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : ((fn: () => void) => Promise.resolve().then(fn))

/*
 * a validation function which returns the supplied value if it has the
 * required type, or raises a TypeError if it doesn't.
 *
 * this kind of function usually takes a type/types parameter but we don't need
 * that here as all the checked values are functions:
 *
 *   - the callback (required)
 *   - the error handler (optional)
 *   - each listener (optional)
 */
const checkFunction = <T>(value: T, name: string) => {
    if (typeof value === 'function') {
        return value
    }

    const got = value === null ? 'null' : typeof value

    throw Object.assign(
        new TypeError(`Invalid ${name}: expected function, got: ${got}`),
        { value }
    )
}

/*
 * pass a delegating function (e.g. `done`) into the supplied callback. when
 * invoked, this function forwards the call to all registered listeners, passing
 * them the same `this` value and arguments. the listeners are then
 * unregistered, i.e. they're only called once.
 *
 * if an optional error-handler is supplied, it is used to handle errors which
 * occur when listeners are invoked; otherwise these errors are logged with
 * `console.error`.
 *
 * `when` returns a function which is used to register listeners, or, if the
 * listener is omitted, a promise is returned which is resolved when the
 * delegate is called, or immediately if it has been called already. if a
 * listener is supplied, a function is returned which can be used to unregister
 * the listener if it hasn't already been called.
 */
export default function when (callback: Callback, onError: ErrorHandler = console.error) {
    type Result = { this: unknown; args: any[] };

    let result: Result | undefined

    const listeners = new Map<symbol, Listener>()

    const run = (fn: Listener) => defer(() => {
        try {
            fn()
        } catch (e) {
            onError(e)
        }
    })

    const done = function (this: unknown, ...args: any[]) {
        if (result) {
            return
        }

        result = { this: this, args }

        for (const listener of listeners.values()) {
            run(() => listener.apply(this, args))
        }

        listeners.clear() // so +unsubscribe+ returns false
    }

    const subscribe = (...args: [] | [Listener]) => {
        let key = DUMMY_KEY, listener: Listener, promise

        if (args.length) {
            listener = checkFunction(args[0], 'listener')
        } else {
            promise = new Promise(resolve => {
                listener = (...args) => resolve(args)
            })
        }

        if (result) {
            run(() => listener.apply(result!.this, result!.args))
        } else {
            listeners.set(key = Symbol(), listener!)
        }

        return promise || (() => listeners.delete(key))
    }

    checkFunction(onError, 'error handler')
    checkFunction(callback, 'callback')(done)

    return subscribe as Subscribe
}
