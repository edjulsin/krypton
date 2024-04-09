const path = require('path')
const distPath = path.resolve(__dirname, '../dist')
const srcPath = path.resolve(__dirname, '../src')

module.exports = {
    common: ({
        filename = '[name]-bundle.js',
        mode = 'development',
        devServer = {},
        plugins = [],
        rules = []
    }) =>
        Object.assign({
            mode,
            entry: {
                index: path.join(srcPath, '/index.js')
            },
            output: {
                filename,
                path: distPath,
                publicPath: '/'
            },
            plugins,
            module: {
                rules: [
                    {
                        test: /\.(png|ico)$/,
                        type: 'asset/resource',
                        generator: {
                            filename: 'assets/images/[name]-[hash][ext]'
                        }
                    },
                    {
                        test: /\.svg$/i,
                        type: 'asset',
                        resourceQuery: /url/,
                    },
                    {
                        test: /\.svg$/,
                        use: [ '@svgr/webpack' ],
                        exclude: /.*sprite\.svg/,
                        resourceQuery: { not: [ /url/ ] },
                        issuer: /\.js$/
                    },
                    {
                        test: /\.(woff(2)?|eot|ttf|otf)$/,
                        type: 'asset/inline'
                    },
                    {
                        test: /\.svg$/,
                        type: 'asset/inline',
                        issuer: /\.scss$/
                    },
                    {
                        test: /\.svg$/,
                        include: /.*sprite\.svg/,
                        type: 'asset/resource',
                        generator: {
                            filename: 'assets/images/[name]-[hash][ext]'
                        }
                    }
                ].concat(rules)
            }
        },
            (Object.keys(devServer).length > 0 ? { devServer } : {})
        ),
    distPath,
    srcPath,
    path
}

