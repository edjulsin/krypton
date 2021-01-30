const { common, srcPath, path, distPath } = require('./common')
const { CleanWebpackPlugin: CleanDist }  = require('clean-webpack-plugin')
const CSSExtract = require('mini-css-extract-plugin')
const MinifyJS = require('terser-webpack-plugin')
const HTMLPlugin = require('html-webpack-plugin')

const test = common({
    devServer: {
       
    },
    plugins: [],
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

console.log('!!html-loader!' + path.join(srcPath, '/html', '/index.html'))