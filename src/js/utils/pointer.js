import { pointers } from 'd3';
import { compose, map, mean, transpose } from 'ramda';

export default compose(
    map(mean),
    transpose,
    pointers
)