import React from 'react'
import { useFilters } from '../contexts/FiltersContext'

export default function Breadcrumbs() {
  const { selectedAreaId, setSelectedAreaId, areaInfo } = useFilters()

  // Build the breadcrumb trail by walking up the parent chain from selectedAreaId
  const trail = []
  let currentId = selectedAreaId
  console.log('Building breadcrumbs for selectedAreaId:', selectedAreaId)
  console.log('Current areaInfo keys:', Object.keys(areaInfo))
  console.log('Selected area in areaInfo:', areaInfo[selectedAreaId])
  
  while (currentId && areaInfo[currentId]) {
    console.log('Processing currentId:', currentId)
    console.log('Current area data:', areaInfo[currentId])
    trail.unshift({ id: currentId, name: areaInfo[currentId].name })
    currentId = areaInfo[currentId].parent_id
    console.log('Next parent_id:', currentId)
  }
  // Always start with Home
  trail.unshift({ id: null, name: 'Home' })
  console.log('Built breadcrumb trail:', trail)

  const handleClick = (areaId) => {
    if (window.zoomToAreaById) {
      window.zoomToAreaById(areaId)
    }
    setSelectedAreaId(areaId)
  }

  return (
    <nav className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 16px 0' }}>
      {trail.map((crumb, idx) => (
        <React.Fragment key={crumb.id || 'home'}>
          <button
            onClick={() => handleClick(crumb.id)}
            style={{
              background: 'none',
              border: 'none',
              color: idx === trail.length - 1 ? '#222' : '#007bff',
              fontWeight: idx === trail.length - 1 ? 'bold' : 'normal',
              cursor: idx === trail.length - 1 ? 'default' : 'pointer',
              textDecoration: idx === trail.length - 1 ? 'none' : 'underline',
              padding: 0
            }}
            disabled={idx === trail.length - 1}
            aria-current={idx === trail.length - 1 ? 'page' : undefined}
          >
            {crumb.id === null ? '🏠' : crumb.name}
          </button>
          {idx < trail.length - 1 && <span style={{ color: '#888' }}>/</span>}
        </React.Fragment>
      ))}
    </nav>
  )
} 