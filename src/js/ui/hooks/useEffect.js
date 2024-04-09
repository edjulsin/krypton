import { useEffect } from 'react'
import safe from './safe'

export default (callback, dependencies = []) => {
    useEffect(() => safe(callback, ...dependencies), dependencies)
}