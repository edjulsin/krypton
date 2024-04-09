const { common, srcPath } = require('./common')
const { CleanWebpackPlugin: CleanDist } = require('clean-webpack-plugin')
const CSSExtract = require('mini-css-extract-plugin')
const HTMLPlugin = require('html-webpack-plugin')

module.exports = common({
    mode: 'production',
    filename: 'js/[name]-[contenthash].bundle.js',
    plugins: [
        new HTMLPlugin({
            template: srcPath + '/html/index.html',
            minify: true
        }),
        new CSSExtract({ filename: 'css/[name]-[contenthash].css' }),
        new CleanDist()
    ],
    rules: [
        {
            test: /\.scss$/,
            use: [
                CSSExtract.loader,
                'css-loader',
                'postcss-loader',
                'sass-loader'
            ]
        },
        {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [ '@babel/preset-react', [ '@babel/preset-env', { targets: { node: '12' } } ] ]
                }
            }
        }
    ]
})