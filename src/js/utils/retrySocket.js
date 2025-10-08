import { fromEvent, timer, retry, concatMap, iif, catchError } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

const retrySocket = retry({
    resetOnSuccess: true,
    delay: (error, count) => {
        if(count < 5) {
            const idle = () => document.visibilityState === 'hidden'
            const onLine = fromFetch('/api/platform/status').pipe(
                catchError(() =>
                    timer(60000 * count)
                )
            )
            const onActive = fromEvent(document, 'visibilitychange').pipe(
                concatMap(() => onLine)
            )
            return timer(5000).pipe(
                concatMap(() =>
                    iif(idle, onActive, onLine)
                )
            )
        } else {
            return []
        }
    }
})

export default retrySocket