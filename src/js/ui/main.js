import React from 'react'
import Trending from './trending'
import Candle from './candle'
import Book from './book'

export default ({ state, dispatch }) => (
    <main className='main'>
        <div className='fixed'>
            <h2 className='fixed__title'>TRENDING</h2>
        </div>
        <Trending />
        <Candle />
        <Book />
    </main>
)
