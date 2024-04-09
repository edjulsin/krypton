
import { querySelector } from './utils'
import React from 'react'
import UI from './ui'

import { createRoot } from 'react-dom/client'

createRoot(querySelector('.root')).render(<UI />)
