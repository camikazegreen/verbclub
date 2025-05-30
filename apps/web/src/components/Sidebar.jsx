import React from 'react'
import ContextualFiltersPane from './ContextualFiltersPane'
import { useFilters } from '../context/FiltersContext'

export default function Sidebar() {
  const { visibleAreas, hoveredId, selectedId, setHoveredId, setSelectedId } = useFilters()

  return (
    <ContextualFiltersPane
      title="Climbing Areas"
      items={visibleAreas}
      hoveredId={hoveredId}
      selectedId={selectedId}
      onHover={setHoveredId}
      onClick={setSelectedId}
    />
  )
} 