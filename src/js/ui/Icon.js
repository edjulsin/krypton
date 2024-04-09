import React, { forwardRef } from 'react'
import Sprite from '../../assets/images/icons/sprite.svg'
import { appendClassName } from '../utils'

export default forwardRef(function Icon({
    name,
    size = 'medium',
    className = '',
    ...attributes
}, ref) {
    return (
        <svg
            ref={ ref }
            className={ appendClassName('icon', `icon-${size}`, className) }
            { ...attributes }
        >
            <use xlinkHref={ `${Sprite}#${name}` }></use>
        </svg>
    )
})