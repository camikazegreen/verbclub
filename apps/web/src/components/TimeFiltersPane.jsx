import React from 'react'
import { useCalendar } from '../contexts/CalendarContext'
import { useCalendarStateService } from '../services/calendarStateService'
import { getTimeReferences } from '../utils/dateUtils'

export default function TimeFiltersPane() {
  const { hoveredDate, setHoveredDate } = useCalendar()
  const { timeReference, updateTimeSelection } = useCalendarStateService()
  
  const timeRefs = getTimeReferences()

  const handleTimeRefClick = (refId) => {
    console.log('[TimeFiltersPane] Time reference clicked:', refId)
    updateTimeSelection(refId, 'sidebar')
  }

  // Determine if a time reference is selected
  const isSelected = (refId) => {
    return timeReference === refId
  }

  // Check if a parent item has a selected child
  const hasSelectedChild = (ref) => {
    if (!ref.children) return false
    return ref.children.some(child => timeReference === child.id)
  }

  const renderTimeRef = (ref, level = 0) => {
    const selected = isSelected(ref.id)
    const hasChildren = ref.children && ref.children.length > 0
    const parentHasSelected = hasSelectedChild(ref)
    
    return (
      <li key={ref.id}>
        <button
          type="button"
          style={{
            width: '100%',
            padding: level === 0 ? '14px 16px' : '10px 16px 10px 32px',
            background: selected
              ? '#1a1a1a'
              : parentHasSelected && level === 0
              ? '#f5f5f5'
              : '#fff',
            color: selected ? '#fff' : '#000',
            border: 'none',
            borderBottom: '1px solid #e2e2e2',
            borderRadius: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: selected ? 'bold' : level === 0 ? '600' : '400',
            fontSize: level === 0 ? '16px' : '14px',
            transition: 'all 0.15s ease',
          }}
          onClick={() => handleTimeRefClick(ref.id)}
        >
          {ref.label}
        </button>
        {hasChildren && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ref.children.map(child => renderTimeRef(child, level + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="time-filters-pane" style={{ 
      background: '#fff', 
      borderRight: '1px solid #eee', 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <h3 style={{ margin: '16px 0 12px 16px' }}>Time</h3>
      <div className="time-filters-content" style={{ 
        padding: 0,
        flex: 1,
        overflowY: 'auto'
      }}>
        {timeRefs.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '16px' }}>No time references available</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {timeRefs.map(ref => renderTimeRef(ref))}
          </ul>
        )}
      </div>
    </div>
  )
}

