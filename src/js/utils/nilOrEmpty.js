import { isEmpty, isNil, anyPass } from 'ramda'

export default anyPass([ isEmpty, isNil, v => v !== v ])