import { compose, curryN, subtract, } from 'ramda'
import abs from './abs'

export default curryN(2, compose(abs, subtract))