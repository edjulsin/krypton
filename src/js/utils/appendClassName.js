import { compose, join, reject, isEmpty, split, uniq, chain, unapply } from 'ramda'

export default compose(
    join(' '),
    uniq,
    chain(
        split(' ')
    ),
    unapply(
        reject(isEmpty)
    )
)