import React, { useCallback, useState } from 'react'
import Button from './Button'
import Icon from './Icon'
import { ToggleMenuPlacements } from './Placement'
import { compose, prop } from 'ramda'

const Preview = ({ children, outlined, visible, ...attributes }) => (
    <Button
        display='block'
        size='wide'
        outlined={ outlined }
        highlighted={ visible }
        { ...attributes }
    >
        <span className='select'>
            <span className='select-preview'>
                { children }
            </span>
            <span className='select-icon'>
                <Icon
                    name='angledown'
                    style={ {
                        transform: `rotate(${visible ? '180deg' : '0deg'})`,
                        transition: 'transform 250ms ease-in-out'
                    } }
                />
            </span>
        </span>
    </Button>
)

export default function Select({
    children,
    preview = '',
    outlined = true,
    ...attributes
}) {
    const [ visible, setVisible ] = useState(false)

    return (
        <ToggleMenuPlacements
            onToggle={
                useCallback(compose(
                    setVisible,
                    prop('visible')
                ), [])
            }
            display='inline'
            { ...attributes }
        >
            <Preview
                visible={ visible }
                outlined={ outlined }
            >
                { children || preview }
            </Preview>
        </ToggleMenuPlacements>
    )
}