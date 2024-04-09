import React from 'react'
import Logo from '../../assets/images/logo/krypton.svg'

const Maintenance = ({ message }) => (
    <main className='maintenance'>
        <Logo className='maintenance-logo' />
        <p className='maintenance-message'>
            { message }
        </p>
    </main>
)

export default Maintenance