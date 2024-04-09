import React from 'react'
import { appendClassName } from '../utils'
import Icon from './Icon'

const Socket = ({ status, ...attributes }) => (
    <div
        className='status'
        { ...attributes }
    >
        <span className={ appendClassName('status-icon', 'status-icon-' + status.type) }>
            <Icon name={ status.type } />
        </span>
        <span className='status-message'>
            { status.message }
        </span>
    </div>
)

export default Socket