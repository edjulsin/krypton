import { curry, is } from 'ramda';
import { useRef } from 'react';

export default value => {
    const ref = useRef(value)
    const setRef = curry((ref, value) => {
        if(is(Function, value)) {
            ref.current = value(ref.current)
        } else {
            ref.current = value
        }
    })
    return [ ref, setRef(ref) ]
}