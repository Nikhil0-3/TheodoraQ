import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './features/auth'
import AppRoutes from './router/AppRoutes'

/**
 * Main App Component
 * Using feature-based architecture for better scalability
 * - features/auth: Authentication logic and components
 * - features/admin: Admin-specific features
 * - features/candidate: Candidate-specific features
 * - shared: Reusable components across features
 * - core: Core utilities and services
 * - router: Centralized routing configuration
 */
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App