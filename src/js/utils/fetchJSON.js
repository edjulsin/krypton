import { compose, andThen } from 'ramda';
import toJSON from './toJSON';

export default compose(andThen(toJSON), fetch)