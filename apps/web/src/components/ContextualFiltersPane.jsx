import React from 'react'
import Breadcrumbs from './Breadcrumbs'
import { useFilters } from '../contexts/FiltersContext'
import { useAreaStateService } from '../services/areaStateService'

export default function ContextualFiltersPane() {
  const { visibleAreas, hoveredId, setHoveredId, selectedAreaId, areaInfo } = useFilters()
  const { updateAreaState } = useAreaStateService()

  const handleAreaClick = (areaId) => {
    if (window.zoomToAreaById) {
      window.zoomToAreaById(areaId)
    }
    console.log('[ContextualFiltersPane] calling updateAreaState from sidebar with', areaId)
    updateAreaState(areaId, 'sidebar')
  }

  return (
    <div className="contextual-filters-pane" style={{ 
      background: '#fff', 
      borderRight: '1px solid #eee', 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <h3 style={{ margin: '16px 0 12px 16px' }}>Areas</h3>
      <Breadcrumbs />
      <div className="contextual-filters-content" style={{ 
        padding: 0,
        flex: 1,
        overflowY: 'auto'
      }}>
        {visibleAreas.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>No areas in view</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {visibleAreas.map(area => {
              // Use name from areaInfo if available (from database), otherwise fall back to map tile name
              const displayName = areaInfo[area.id]?.name || area.name
              return (
                <li key={area.id}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: area.id === selectedAreaId
                        ? '#000'
                        : area.id === hoveredId
                        ? '#000'
                        : '#fff',
                      color: area.id === selectedAreaId || area.id === hoveredId ? '#fff' : '#000',
                      border: area.id === selectedAreaId 
                        ? '2px solid #000'
                        : area.id === hoveredId
                        ? '1px solid #000'
                        : '1px solid #000',
                      borderRadius: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: area.id === selectedAreaId ? 'bold' : '500',
                      fontSize: '16px',
                      transition: 'all 0.15s ease',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                    onMouseEnter={() => setHoveredId(area.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleAreaClick(area.id)}
                  >
                    {displayName}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
} 