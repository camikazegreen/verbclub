import React, { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from './components/Layout'
import MapView from './views/MapView'
import CalendarView from './views/CalendarView'
import PeopleView from './views/PeopleView'
import ActivityView from './views/ActivityView'
import Modal from './components/Modal'
import LoginModal from './components/LoginModal'
import { FiltersProvider } from './contexts/FiltersContext'
import { CalendarProvider } from './contexts/CalendarContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// OAuth callback handler component
function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleOAuthCallback } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      handleOAuthCallback(token)
      navigate('/')
    } else {
      navigate('/login')
    }
  }, [searchParams, handleOAuthCallback, navigate])

  return <div>Completing login...</div>
}

function AppContent() {
  const location = useLocation()
  const modalRoutes = ['/login', '/profile']

  return (
    <FiltersProvider>
      <CalendarProvider>
        <Layout>
          <Routes location={location}>
            <Route path="/" element={<ActivityView />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/map/climbing" element={<MapView />} />
            <Route path="/map/climbing/:areaId" element={<MapView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/people" element={<PeopleView />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
          </Routes>
        </Layout>

        {modalRoutes.includes(location.pathname) && (
          <Modal className={location.pathname === '/login' ? 'no-padding' : ''}>
            {location.pathname === '/login' ? (
              <LoginModal />
            ) : (
              <>
                <h2>Profile</h2>
                <p>This is a modal over the main content.</p>
              </>
            )}
          </Modal>
        )}
      </CalendarProvider>
    </FiltersProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
} 