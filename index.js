const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')

const proxy = createProxyMiddleware({
    target: 'https://api-pub.bitfinex.com/v2',
    changeOrigin: true,
    pathFilter: [ '/ticker', '/tickers', '/book', '/candles', '/platform', '/conf' ],
    on: {
        proxyRes: (proxyRes, req, res) => {
            proxyRes[ 'Access-Control-Allow-Origin' ] = '*'
        }
    }
})

const app = express()

const port = 1234

app.use(
    express.static('./dist')
)

app.get('/', (_, res) =>
    res.sendFile('./dist/index.html')
)

app.use(proxy)

app.listen(port)