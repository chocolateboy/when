export type Callback  = (done: <A extends any[]>(...args: A) => void) => void;
export type ErrorHandler = (error: any) => void;
export type Listener = <A extends any[]>(this: unknown, ...args: A) => void;

export interface Subscribe {
    <A extends any[]>(): Promise<A>;
    (listener: Listener): () => boolean;
};

// a default key which is guaranteed to *not* be found in the listeners map
// (Map<symbol, Listener>)
//
// used to look up the listener (and fail) when the event has already fired or
// when the return value is a promise (no listener)
const DUMMY_KEY = Symbol()

const defer = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : ((fn: () => void) => Promise.resolve().then(fn))

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

const when = (callback: Callback, onError: ErrorHandler = console.error) => {
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

export default when
