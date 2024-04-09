import { curry } from 'ramda';

export default curry(function propEqual(name, value, obj) {
    return obj[ name ] === value
})