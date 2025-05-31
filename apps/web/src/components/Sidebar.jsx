import React from 'react'
import { useFilters } from '../contexts/FiltersContext'
import ContextualFiltersPane from './ContextualFiltersPane'

export default function Sidebar() {
  const { visibleAreas } = useFilters()

  return (
    <div className="sidebar">
      <ContextualFiltersPane />
    </div>
  )
} 