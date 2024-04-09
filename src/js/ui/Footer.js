import React from 'react'

export default function Footer() {
    return (
        <footer className='footer'>
            <small className='footer-year'>@{ new Date().getFullYear() }</small>
            <small className='footer-author'>Designed by edjulsin</small>
        </footer>
    )
}



