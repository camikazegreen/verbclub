import React from 'react'
import Breadcrumbs from './Breadcrumbs'
import { useFilters } from '../contexts/FiltersContext'

export default function ContextualFiltersPane() {
  const { visibleAreas, hoveredId, setHoveredId, selectedAreaId, setSelectedAreaId } = useFilters()

  const handleAreaClick = (areaId) => {
    if (window.zoomToAreaById) {
      window.zoomToAreaById(areaId)
    }
    setSelectedAreaId(areaId)
  }

  return (
    <div className="contextual-filters-pane" style={{ background: '#fff', borderRight: '1px solid #eee', minWidth: 220, maxWidth: 300, overflow: 'hidden' }}>
      <h3 style={{ margin: '16px 0 12px 16px' }}>Areas</h3>
      <Breadcrumbs />
      <div className="contextual-filters-content" style={{ padding: '0 16px 16px 16px' }}>
        {visibleAreas.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>No areas in view</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {visibleAreas.map(area => (
              <li key={area.id} style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: area.id === selectedAreaId
                      ? '#007bff'
                      : area.id === hoveredId
                      ? '#e6f0ff'
                      : '#f7f7f7',
                    color: area.id === selectedAreaId ? '#fff' : '#222',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: area.id === selectedAreaId ? 'bold' : 'normal',
                    transition: 'background 0.2s',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                  onMouseEnter={() => setHoveredId(area.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleAreaClick(area.id)}
                >
                  {area.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
} 