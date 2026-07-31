import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './mobile-map-controls.css'
import './shade-validation.css'
import './review.css'
import './legend-overrides.css'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
