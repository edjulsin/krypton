import { Observable, auditTime } from 'rxjs';

const resizeObserver = refs => {
    const program = new Observable(subscribe => {
        const observer = new ResizeObserver(v => subscribe.next(v))

        refs.forEach(ref =>
            observer.observe(ref)
        )

        return () => observer.disconnect()
    })

    return program.pipe(
        auditTime(300)
    )
}

export default resizeObserver