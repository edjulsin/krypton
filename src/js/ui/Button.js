import React, { forwardRef } from 'react'
import { appendClassName } from '../utils'

export default forwardRef(function Button({
    title = '',
    children,
    className = '',
    color = 'dark',
    display = 'inline',
    highlighted = false,
    underlined = false,
    disabled = false,
    round = true,
    size = 'slim',
    outlined = false,
    ...attributes
}, ref) {
    return (
        <button
            title={ title }
            ref={ ref }
            disabled={ disabled }
            className={
                appendClassName(
                    'button',
                    'button-' + color,
                    'button-' + display,
                    'button-' + size,
                    highlighted ? 'button-highlighted' : '',
                    disabled ? 'button-disabled' : '',
                    underlined ? 'button-underlined' : '',
                    round ? 'button-round' : '',
                    outlined ? 'button-outlined' : '',
                    className
                )
            }
            { ...attributes }
        >
            { children }
        </button>
    )
})