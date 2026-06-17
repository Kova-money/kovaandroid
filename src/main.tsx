import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './AuthContext.tsx'
import { ZeroDevProvider } from './ZeroDevContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ZeroDevProvider>
        <App />
      </ZeroDevProvider>
    </AuthProvider>
  </React.StrictMode>,
)
