import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { NavigationGuardProvider } from './context/NavigationGuardContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <NavigationGuardProvider>
          <App />
        </NavigationGuardProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
