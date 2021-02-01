import React from 'react'
import ReactDOM from 'react-dom'
import App from './ui'


const Render = state =>
    ReactDOM.render(
        <App state={state} dispatch={(action, payload) => render(state)} />, 
        document.querySelector('.root')
    )

Render({})