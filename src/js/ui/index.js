import React from 'react'
import Main from './main'
import Footer from './footer'
import Header from './header'


export default ({ state, dispatch }) => (
    <>
        <Header />
        <Main state={state} dispatch={dispatch} />
        <Footer />
    </>
)
