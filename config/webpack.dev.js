const { common, srcPath } = require('./common')
const HTMLPlugin = require('html-webpack-plugin')


module.exports = common({
    devServer: {
        historyApiFallback: true,
        contentBase: srcPath,
        compress: true,
        hot: true,
        port: 1234,
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
                loader: "babel-loader",
                options: {
                    presets: [ '@babel/preset-react' ]
                }
            }
          },
        {
            test: /\.scss$/,
            use: [
                "style-loader", 
                "css-loader", 
                "sass-loader"
            ]
        }
    ]
})