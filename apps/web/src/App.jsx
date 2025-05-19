import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import MapView from './views/MapView'
import CalendarView from './views/CalendarView'
import PeopleView from './views/PeopleView'
import Modal from './components/Modal'

export default function App() {
  const location = useLocation()
  const modalRoutes = ['/login', '/profile']

  return (
    <>
      <Layout>
        <Routes location={location}>
          <Route path="/" element={<MapView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/people" element={<PeopleView />} />
        </Routes>
      </Layout>

      {modalRoutes.includes(location.pathname) && (
        <Modal>
          <h2>{location.pathname === '/login' ? 'Login' : 'Profile'}</h2>
          <p>This is a modal over the main content.</p>
        </Modal>
      )}
    </>
  )
} 