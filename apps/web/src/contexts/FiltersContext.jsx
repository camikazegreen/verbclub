import React, { createContext, useContext, useState, useEffect } from 'react'

const FiltersContext = createContext()

export function FiltersProvider({ children }) {
  const [visibleAreas, setVisibleAreas] = useState([])
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const [areaInfo, setAreaInfo] = useState({})

  // Fetch area info for the current visible areas
  useEffect(() => {
    const fetchAreaInfo = async () => {
      if (!visibleAreas || visibleAreas.length === 0) {
        setAreaInfo({})
        return
      }
      const ids = visibleAreas.map(a => a.id).join(',')
      try {
        const res = await fetch(`/api/areas/info?ids=${ids}`)
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
  }, [visibleAreas])

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