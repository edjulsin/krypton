import { unless, is } from 'ramda'
import singleton from './singleton'

export default unless(is(Array), singleton)