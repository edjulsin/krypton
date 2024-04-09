import React from 'react'
import { defaultColor } from '../utils'

const dots = [ 1, 2, 3 ]

const Loader = () => (
    <svg
        className='loader'
        viewBox='0 0 25 25'
        width={ 25 }
        height={ 25 }
    >
        {
            dots.map(i =>
                <rect
                    key={ i }
                    className='loader-rect'
                    fill={ defaultColor }
                    width={ 5 }
                    height={ 5 }
                    x={ ((25 / 3) * i) - (25 / 3 / 2) - (5 / 2) }
                    y={ (25 / 2) - (5 / 2) }
                >
                    <animate
                        attributeName='rx'
                        values='0;5;0'
                        dur='1s'
                        repeatCount='indefinite'
                        begin={ `0.${i}` }
                    />
                </rect>
            )
        }
    </svg>
)

export default Loader