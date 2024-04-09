import { allPass, equals, head, is, last, o } from 'ramda'
import { first, concatMap, map, Observable, share, filter, timer, take, skip, merge } from 'rxjs'
import retrySocket from './retrySocket'

const stream = ({
    socket,
    flags,
    payload
}) => {
    const source = socket.pipe(
        first(message =>
            is(Object, message)
                ? Object.keys(payload).every(key =>
                    payload[ key ] === message[ key ]
                )
                : false
        ),
        concatMap(({ chanId }) =>
            new Observable(subscribe => {
                const data = socket.pipe(
                    filter(
                        allPass([
                            is(Array),
                            o(equals(chanId), head),
                            o(is(Array), last)
                        ])
                    ),
                    map(last)
                )

                const snapshot = data.pipe(
                    take(1),
                    map(v =>
                        ([ 'snapshot', v ])
                    )
                )
                const update = data.pipe(
                    skip(1),
                    map(v =>
                        ([ 'update', v ])
                    )
                )

                const subscription = merge(snapshot, update).subscribe(subscribe)

                return () => {
                    subscription.unsubscribe()
                    socket.next({ event: 'unsubscribe', chanId: chanId })
                }
            })
        )
    )

    const program = timer(1000).pipe(
        concatMap(() =>
            new Observable(subscribe => {
                const subscription = source.subscribe(subscribe)
                if(flags) {
                    socket.next({ event: 'conf', flags })
                    socket.next({ event: 'subscribe', ...payload })
                } else {
                    socket.next({ event: 'subscribe', ...payload })
                }
                return () => subscription.unsubscribe()
            })
        ),
        retrySocket,
        share()
    )

    return program
}

export default stream