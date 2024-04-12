import { fromEvent, timer, retry, concatMap, iif, of, catchError } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

const retrySocket = retry({
    resetOnSuccess: true,
    delay: (error, count) => {
        if(count < 5) {
            console.log(error)
            const offline = !navigator.onLine
            const active = () => document.visibilityState === 'visible'
            const onActive = fromEvent(document, 'visibilitychange')
            const onConnected = fromEvent(window, 'online')
            const onInternet = fromFetch('/platform/status')
            const onError = catchError(() =>
                timer(60000 * count)
            )
            const timeout = timer(15000)
            if(offline) {
                return timeout.pipe(
                    concatMap(() =>
                        onConnected.pipe(
                            concatMap(() =>
                                iif(active, onInternet, onActive)
                            ),
                            onError
                        )
                    )
                )
            } else {
                return timeout.pipe(
                    concatMap(() =>
                        onInternet.pipe(
                            concatMap(v =>
                                iif(active, of(v), onActive)
                            ),
                            onError
                        )
                    )
                )
            }
        } else {
            return []
        }
    }
})

export default retrySocket