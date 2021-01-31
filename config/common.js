const path = require('path')
const distPath = path.resolve(__dirname, '../dist')
const srcPath = path.resolve(__dirname, '../src')

module.exports = {
    common: ({ 
        mode = 'development', 
        devtool = 'inline-source-map', 
        filename = '[name]-bundle.js',
        devServer = {},
        plugins = [], 
        rules = []
    }) => 
    Object.assign({
        entry: {
            index: path.join(srcPath, '/index.js')
        },
        devtool: devtool,
        mode: mode,
        output: {
            filename: filename,
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
                    test: /\.(woff(2)?|eot|ttf|otf|svg)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/fonts/[name]-[hash][ext]'
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

