import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import MapView from './views/MapView'
import CalendarView from './views/CalendarView'
import PeopleView from './views/PeopleView'
import ActivityView from './views/ActivityView'
import Modal from './components/Modal'
import { FiltersProvider } from './contexts/FiltersContext'
import { CalendarProvider } from './contexts/CalendarContext'

export default function App() {
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
        </Routes>
      </Layout>

      {modalRoutes.includes(location.pathname) && (
        <Modal>
          <h2>{location.pathname === '/login' ? 'Login' : 'Profile'}</h2>
          <p>This is a modal over the main content.</p>
        </Modal>
      )}
      </CalendarProvider>
    </FiltersProvider>
  )
} 