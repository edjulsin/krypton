import { useLayoutEffect } from 'react'
import safe from './safe'

export default (callback, dependencies = []) => {
    useLayoutEffect(() => safe(callback, ...dependencies), dependencies)
}