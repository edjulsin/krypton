import React, { useState } from 'react';
import { appendClassName } from '../utils';
import { isNil } from 'ramda';

export default function Check({
    title = '',
    id = 'checkbox-input',
    className = '',
    children,
    onChange = v => v,
    checked,
    ...attributes
}) {
    const [ value, setValue ] = useState(() => checked || false)

    const uncontrolled = isNil(checked)

    const refValue = uncontrolled ? value : checked

    const refCallback = uncontrolled ? setValue : onChange

    return (
        <input
            title={ title }
            type='checkbox'
            className={ appendClassName(
                'check',
                'check-' + (refValue ? 'enabled' : 'disabled'),
                className
            ) }
            id={ id }
            checked={ refValue }
            onChange={ () => refCallback(!refValue) }
            { ...attributes }
        />
    )
}