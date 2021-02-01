import React from 'react'
import Select from './select'

export default ({ state, dispatch }) => (
    <section className='candle'>
        <Select state={state} dispatch={dispatch}/>
        <svg className='candle__chart'></svg>
    </section>
)