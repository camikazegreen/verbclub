import React from 'react'
import { useLocation } from 'react-router-dom'
import { useFilters } from '../contexts/FiltersContext'
import ContextualFiltersPane from './ContextualFiltersPane'
import TimeFiltersPane from './TimeFiltersPane'

export default function Sidebar() {
  const { visibleAreas } = useFilters()
  const location = useLocation()
  const isMapPage = location.pathname.startsWith('/map/climbing')
  const isCalendarPage = location.pathname === '/calendar'

  return (
    <>
      {isMapPage && <ContextualFiltersPane />}
      {isCalendarPage && <TimeFiltersPane />}
      {/* You can add other sidebar content here */}
    </>
  )
} 