import React from 'react'

export default ({ state, dispatch }) => (
    <div className='select'>
        <span className='select__label'>BTC/USD</span>
        <ul className='select__list'>
            <li className='select__list-item'>BTC/USD</li>
            <li className='select__list-item'>ETH/USD</li>
            <li className='select__list-item'>ADA/USD</li>
            <li className='select__list-item'>NEO/USD</li>
            <li className='select__list-item'>BTC/ADA</li>
        </ul>
    </div>
)