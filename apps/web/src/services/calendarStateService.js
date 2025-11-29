import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCalendar } from '../contexts/CalendarContext'
import { getTimeReferenceRange } from '../utils/dateUtils'

export const useCalendarStateService = () => {
  const navigate = useNavigate()
  const { 
    selectedDate, 
    setSelectedDate,
    selectedDateRange, 
    setSelectedDateRange,
    setSelectedHour,
    timeReference,
    setTimeReference
  } = useCalendar()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const hasInitialized = useRef(false)

  const updateTimeSelection = async (newTimeReference, source) => {
    console.log(`[updateTimeSelection] called from ${source} with timeReference=${newTimeReference}, current=${timeReference}`)
    
    if (isUpdating) {
      console.log('[updateTimeSelection] Update in progress, skipping')
      return
    }
    
    const hasStateChanged = timeReference !== newTimeReference
    const shouldScroll = hasStateChanged || source === 'sidebar' // Always scroll when clicking from sidebar

    // Skip if no state change and not from sidebar
    if (!hasStateChanged && source !== 'sidebar') {
      console.log(`[updateTimeSelection] No state change needed: ${timeReference} -> ${newTimeReference}`)
      return
    }
    
    // If clicking the same time reference from sidebar, still trigger scroll
    if (!hasStateChanged && source === 'sidebar') {
      console.log(`[updateTimeSelection] Same time reference clicked from sidebar, triggering scroll`)
    }

    console.log(`[updateTimeSelection] Updating time selection: ${timeReference} -> ${newTimeReference} (source: ${source})`)
    
    setIsUpdating(true)
    try {
      // Handle "all-upcoming" special case (reset zoom)
      if (newTimeReference === 'all-upcoming') {
        setSelectedDate(null)
        setSelectedDateRange(null)
        setTimeReference(null)
        
        if (window.resetCalendarZoom) {
          window.resetCalendarZoom()
        }
        return
      }

      // Get date range for the time reference
      const range = getTimeReferenceRange(newTimeReference)
      
      if (!range) {
        console.error(`[updateTimeSelection] Invalid time reference: ${newTimeReference}`)
        return
      }

      // Always update state when clicking from sidebar, or when state actually changed
      if (hasStateChanged || source === 'sidebar') {
        // Clear selected hour when changing time reference (user is selecting a new time period)
        setSelectedHour(null)
        
        if (range.date) {
          setSelectedDate(range.date)
          setSelectedDateRange(null)
        } else if (range.start && range.end) {
          setSelectedDateRange(range)
          setSelectedDate(null)
        }
        setTimeReference(newTimeReference)

        // Update URL (optional, for deep linking) - only if state changed
        if (hasStateChanged) {
          const urlParams = new URLSearchParams()
          if (newTimeReference) {
            urlParams.set('range', newTimeReference)
          }
          const newPath = `/calendar${urlParams.toString() ? '?' + urlParams.toString() : ''}`
          if (window.location.pathname + window.location.search !== newPath) {
            console.log(`[updateTimeSelection] Navigating to ${newPath}`)
            navigate(newPath)
          }
        }
      }

      // Always scroll/zoom to the date range when clicking from sidebar
      // Use setTimeout to ensure window function is available
      setTimeout(() => {
        if (window.zoomToTimeReference) {
          console.log(`[updateTimeSelection] Calling zoomToTimeReference(${newTimeReference})`)
          window.zoomToTimeReference(newTimeReference, range)
        } else {
          console.log('[updateTimeSelection] window.zoomToTimeReference not available, will retry')
          // Retry after a longer delay
          setTimeout(() => {
            if (window.zoomToTimeReference) {
              window.zoomToTimeReference(newTimeReference, range)
            }
          }, 500)
        }
      }, 50)

      if (!isInitialized) {
        setIsInitialized(true)
        console.log('[updateTimeSelection] Marked as initialized')
      }

    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    console.log('[calendarStateService] useEffect for initial load running')
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Check URL params for time reference
    const urlParams = new URLSearchParams(window.location.search)
    const rangeParam = urlParams.get('range')
    const dateParam = urlParams.get('date')
    
    if (rangeParam && rangeParam !== timeReference) {
      console.log(`[calendarStateService] Initial effect: range param (${rangeParam}) !== timeReference (${timeReference}), calling updateTimeSelection`)
      updateTimeSelection(rangeParam, 'initial-url')
    } else if (dateParam && (!selectedDate || selectedDate.toISOString().split('T')[0] !== dateParam)) {
      // Handle single date selection from URL
      const date = new Date(dateParam)
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
        setSelectedDateRange(null)
        setTimeReference(null)
      }
    }
  }, [])

  return {
    selectedDate,
    selectedDateRange,
    timeReference,
    updateTimeSelection,
    isUpdating,
    isInitialized
  }
}

