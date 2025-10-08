const { common, srcPath } = require('./common')
const HTMLPlugin = require('html-webpack-plugin')

module.exports = common({
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        historyApiFallback: true,
        compress: true,
        hot: true,
        port: 1234,
        static: {
            directory: srcPath
        },
        client: { overlay: true },
        proxy: [
            {
                context: [ '/api/ticker', '/api/tickers', '/api/book', '/api/candles', '/api/platform', '/api/conf' ],
                changeOrigin: true,
                target: 'https://api-pub.bitfinex.com/v2',
                pathRewrite: { '^/api': '' }
            }
        ]
    },
    plugins: [
        new HTMLPlugin({
            template: srcPath + '/html/index.html',
            minify: false
        })
    ],
    rules: [
        {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [ '@babel/preset-react' ]
                }
            }
        },
        {
            test: /\.(scss|css)$/,
            use: [
                "style-loader",
                "css-loader",
                "sass-loader"
            ]
        }
    ]
})