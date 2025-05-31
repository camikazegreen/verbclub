import React, { createContext, useContext, useState, useEffect } from 'react'

const FiltersContext = createContext()

export function FiltersProvider({ children }) {
  const [visibleAreas, setVisibleAreas] = useState([])
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [areaInfo, setAreaInfo] = useState({})

  // Fetch area info for the current visible areas and selected area's ancestors
  useEffect(() => {
    const fetchAreaInfo = async () => {
      // Always include selectedAreaId in the fetch if it exists
      const idsToFetch = new Set(visibleAreas.map(a => a.id))
      if (selectedAreaId) {
        idsToFetch.add(selectedAreaId)
      }
      
      if (idsToFetch.size === 0) {
        setAreaInfo({})
        return
      }

      try {
        const res = await fetch(`/api/areas/info?ids=${Array.from(idsToFetch).join(',')}`)
        if (!res.ok) throw new Error('Failed to fetch area info')
        const data = await res.json()
        
        // Store as a map for easy lookup
        const infoMap = {}
        data.forEach(area => {
          infoMap[area.id] = area
        })
        setAreaInfo(infoMap)
      } catch (err) {
        console.error('Error fetching area info:', err)
        setAreaInfo({})
      }
    }
    fetchAreaInfo()
  }, [visibleAreas, selectedAreaId]) // Add selectedAreaId as a dependency

  return (
    <FiltersContext.Provider value={{
      visibleAreas,
      setVisibleAreas,
      hoveredId,
      setHoveredId,
      selectedAreaId,
      setSelectedAreaId,
      areaInfo
    }}>
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FiltersContext)
  if (!context) {
    throw new Error('useFilters must be used within a FiltersProvider')
  }
  return context
} 