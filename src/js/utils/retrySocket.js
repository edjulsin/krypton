import { fromEvent, timer, retry, concatMap, iif, of, catchError } from 'rxjs'
import { fromFetch } from 'rxjs/fetch'

const retrySocket = retry({
    resetOnSuccess: true,
    delay: (error, count) => {
        if(count < 5) {
            const idle = () => document.visibilityState === 'hidden'
            const onInternet = fromFetch('/platform/status')
            const onActive = fromEvent(document, 'visibilitychange').pipe(
                concatMap(() => onInternet)
            )
            return timer(15000).pipe(
                concatMap(() =>
                    iif(idle, onActive, onInternet)
                ),
                catchError(() =>
                    timer(60000 * count)
                )
            )
        } else {
            return []
        }
    }
})

export default retrySocket