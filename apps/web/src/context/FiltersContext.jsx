import React, { createContext, useContext, useState, useCallback } from 'react'
import PropTypes from 'prop-types'

const FiltersContext = createContext()

export function FiltersProvider({ children }) {
  // Shared state
  const [visibleAreas, setVisibleAreas] = useState([])
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [currentFilter, setCurrentFilter] = useState({ level: 0 })

  // Actions
  const updateVisibleAreas = useCallback((areas) => setVisibleAreas(areas), [])
  const updateHoveredId = useCallback((id) => setHoveredId(id), [])
  const updateSelectedId = useCallback((id) => setSelectedId(id), [])
  const updateCurrentFilter = useCallback((filter) => setCurrentFilter(filter), [])

  const value = {
    visibleAreas,
    hoveredId,
    selectedId,
    currentFilter,
    setVisibleAreas: updateVisibleAreas,
    setHoveredId: updateHoveredId,
    setSelectedId: updateSelectedId,
    setCurrentFilter: updateCurrentFilter,
  }

  return (
    <FiltersContext.Provider value={value}>
      {children}
    </FiltersContext.Provider>
  )
}

FiltersProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used within a FiltersProvider')
  return ctx
}

export default FiltersContext 