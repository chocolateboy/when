import size       from 'rollup-plugin-filesize'
import { terser } from 'rollup-plugin-terser'
import ts         from '@wessberg/rollup-plugin-ts'

const isDevEnv = process.env.NODE_ENV !== 'production'

const $size = size({ showMinifiedSize: false })

const $ts = ts({
    transpiler: 'babel',
})

const $tsMap = ts({
    transpiler: 'babel',
    babelConfig: {
        plugins: ['source-map-support'],
    }
})

const $terser = terser({
    ecma: 2015,
    compress: {
        passes: 2,
        keep_fnames: /\bwhen\b/,
    },
    mangle: {
        reserved: ['when'],
    },
})

const cjs = () => {
    const [external, plugins] = isDevEnv
        ? [['source-map-support/register'], [$tsMap]]
        : [[], [$ts]]

    return {
        external,
        input: 'src/index.ts',
        plugins,
        output: {
            file: 'dist/index.js',
            format: 'cjs',
            sourcemap: isDevEnv,
        },
    }
}

const release = {
    input: 'src/index.ts',
    plugins: [$ts],
    output: [
        {
            file: 'dist/index.esm.js',
            format: 'esm',
        },
        {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'When',
        },
        {
            file: 'dist/index.umd.min.js',
            format: 'umd',
            name: 'When',
            plugins: [$terser, $size],
        },

        // this is just for information: it's not packaged
        {
            file: 'dist/data/index.esm.min.js',
            format: 'esm',
            plugins: [$terser, $size],
        }
    ]
}

const config = isDevEnv ? [cjs()] : [cjs(), release]

export default config
