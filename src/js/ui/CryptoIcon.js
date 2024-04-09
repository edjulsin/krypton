import { toLower } from 'ramda';
import React from 'react';

const extract = context => {
    return context.keys().reduce((obj, key) => ({
        ...obj,
        [ key.slice(2, -4) ]: context(key)
    }), {})
}

const images = {
    16: extract(require.context('../../assets/images/cryptoicons/16', false, /\.(png|jpe?g|svg)$/)),
    32: extract(require.context('../../assets/images/cryptoicons/32', false, /\.(png|jpe?g|svg)$/))
}

const Crypto = ({ name, size = 16 }) => (
    <img
        className={ `crypto cyrpto-${size}` }
        src={ `${images[ size ][ toLower(name) ] || images[ size ].default}` }
        alt={ name }
    />
)

export default Crypto