import { add, subtract, zipWith, call, divide, multiply } from 'ramda'

const zipWithAdd = zipWith(add)
const zipWithSubtract = zipWith(subtract)
const zipWithCall = zipWith(call)
const zipWithDivide = zipWith(divide)
const zipWithMultiply = zipWith(multiply)

export { zipWithMultiply, zipWithAdd, zipWithSubtract, zipWithCall, zipWithDivide }