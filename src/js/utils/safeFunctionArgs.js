import { always, is, unless } from 'ramda';

export default unless(is(Function), always)