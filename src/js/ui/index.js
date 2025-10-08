import React, { useCallback, useState } from 'react'
import { webSocket } from 'rxjs/webSocket'

import Footer from './Footer'
import Header from './Header'
import Chart from './Chart'
import { useEffect } from './hooks'
import Table from './Table'
import Book from './Book'
import { fetchJSON, retrySocket } from '../utils'
import { allPass, fromPairs, has, head, mergeLeft, zip } from 'ramda'
import { ContainerPlacements } from './Placement'
import Status from './Status'
import Maintenance from './Maintenance'
import { Observable, filter, map, merge, share, skip, take } from 'rxjs'

const Main = () => {
    const [ maintenance, setMaintenance ] = useState('')
    const [ socket, setSocket ] = useState({})
    const [ status, setStatus ] = useState({})
    const [ symbol, setSymbol ] = useState('')
    const [ maps, setMaps ] = useState({})
    const [ control, setControl ] = useState({})

    const trigger = useCallback(() => ({
        data: {
            onClick: () => mergeLeft({
                visible: false,
                transition: true
            })
        }
    }), [])

    useEffect(() => {
        const displayStatus = ({ type, message, autoClose }) => {
            setStatus({ type, message })
            setControl({ visible: true, transition: true, autoClose: autoClose })
        }

        const ws = webSocket({
            url: 'wss://api-pub.bitfinex.com/ws/2',
            openObserver: {
                next: () => displayStatus({
                    type: 'success',
                    message: 'Websocket Connection is now Online.',
                    autoClose: 15000
                })
            },
            closingObserver: {
                next: () => displayStatus({
                    type: 'network',
                    message: 'Disconnecting from Websocket Server.',
                    autoClose: 5000
                })
            },
            closeObserver: {
                next: () => displayStatus({
                    type: 'failed',
                    message: 'Websocket Connection is now offline.',
                    autoClose: 0
                })
            }
        })

        const info = new Observable(subscribe => {
            const platform = ws.pipe(
                take(1),
                filter(
                    has('platform')
                ),
                map(v =>
                    ([ 'platform', v ])
                )
            )
            const maintenances = [ 20051, 20060, 20061 ]
            const maintenance = ws.pipe(
                skip(1),
                filter(
                    allPass([
                        has('code'),
                        ({ code }) => maintenances.includes(code)
                    ])
                ),
                map(v =>
                    ([ 'maintenance', v ])
                )
            )
            const subscription = merge(platform, maintenance).subscribe(subscribe)
            return () => subscription.unsubscribe()
        }).pipe(retrySocket)

        const onPlatform = info => {
            if(info.platform.status) {
                setMaintenance('')
                fetchJSON('/api/conf/pub:map:currency:sym')
                    .then(head)
                    .then(fromPairs)
                    .then(setMaps)
            } else {
                setMaintenance('Server under maintenance. Please try again later.')
            }
        }

        const onMaintenance = info => {
            if(Object.fromEntries(zip(maintenance, [ false, false, true ]))[ info.code ]) {
                setMaintenance('')
            } else {
                setMaintenance('Server under maintenance. Please try again later.')
            }
        }

        const callback = { platform: onPlatform, maintenance: onMaintenance }

        const subscription = info.subscribe(([ type, value ]) =>
            callback[ type ](value)
        )

        setSocket(() => ws)

        return () => subscription.unsubscribe()
    }, [])

    return (
        maintenance
            ? <Maintenance message={ maintenance } />
            : <ContainerPlacements
                transition='visibility 1s 500ms, opacity 1s 500ms'
                direction='right'
                alignment='end'
                control={ control }
                trigger={ trigger }
                data={ <Status status={ status } /> }
                dataMargin='20'
            >
                <main className='main'>
                    <Table
                        maps={ maps }
                        onSymbolChange={ setSymbol }
                    />
                    <Chart
                        maps={ maps }
                        socket={ socket }
                        symbol={ symbol }
                    />
                    <Book
                        maps={ maps }
                        socket={ socket }
                        symbol={ symbol }
                    />
                </main>
            </ContainerPlacements>
    )
}

export default () => (
    <>
        <Header />
        <Main />
        <Footer />
    </>
)