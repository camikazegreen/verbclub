import React from 'react'
import { useFilters } from '../contexts/FiltersContext'
import { useAreaStateService } from '../services/areaStateService'

export default function Breadcrumbs() {
  const { selectedAreaId, areaInfo } = useFilters()
  const { updateAreaState } = useAreaStateService()

  // Build breadcrumb trail
  const buildBreadcrumbs = () => {
    const trail = []
    let currentId = selectedAreaId

    while (currentId && areaInfo[currentId]) {
      trail.unshift({
        id: currentId,
        name: areaInfo[currentId].name
      })
      currentId = areaInfo[currentId].parent_id
    }

    return trail
  }

  const breadcrumbs = buildBreadcrumbs()

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <div style={{ padding: '0 16px 16px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {breadcrumbs.map((area, index) => (
          <React.Fragment key={area.id}>
            {index > 0 && (
              <span style={{ color: '#666' }}>›</span>
            )}
            <button
              type="button"
              onClick={() => { console.log('[Breadcrumbs] calling updateAreaState from breadcrumb with', area.id); updateAreaState(area.id, 'breadcrumb'); }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                color: '#007bff',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {area.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
} 