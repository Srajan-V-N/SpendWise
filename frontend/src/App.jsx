import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Subscriptions from './pages/Subscriptions'
import Profile from './pages/Profile'
import Preferences from './pages/Preferences'
import Import from './pages/Import'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 40 40" style={{ marginBottom: 16 }}>
          <rect x="4" y="14" width="32" height="18" rx="4" fill="rgba(0,255,221,0.25)" />
          <rect x="4" y="9" width="32" height="18" rx="4" fill="rgba(0,255,221,0.55)" />
          <rect x="4" y="4" width="32" height="18" rx="4" fill="#00FFDD" />
          <rect x="4" y="14" width="32" height="4" fill="rgba(0,17,15,0.25)" />
          <circle cx="31" cy="15.5" r="2" fill="rgba(0,17,15,0.35)" />
        </svg>
        <div style={{
          width: 32, height: 3, background: 'var(--color-brand)', borderRadius: 9999,
          margin: '0 auto', animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/import" element={<Import />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/preferences" element={<Preferences />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
