import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LoadingPage from './components/LoadingPage.jsx'
import ResultsPage from './components/ResultsPage.jsx'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
