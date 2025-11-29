import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { startOfWeek, addDays, endOfWeek } from 'date-fns'
import { useCalendar } from '../contexts/CalendarContext'
import { useCalendarStateService } from '../services/calendarStateService'
import { getCalendarStartDate, generateWeeks, formatDateId, getCurrentWeekVisibleRange, getTimeReferenceRange, getWeekId, getTimeReferenceIdForDate } from '../utils/dateUtils'
import CalendarGrid from '../components/calendar/CalendarGrid'
import './CalendarView.css'

export default function CalendarView() {
  const scrollContainerRef = useRef(null)
  const calendarTableRef = useRef(null)
  const [error, setError] = useState(null)
  const isMounted = useRef(false)
  const [zoomedWeekId, setZoomedWeekId] = useState(null)
  const { updateTimeSelection } = useCalendarStateService()
  const { 
    selectedDate, 
    setSelectedDate,
    selectedDateRange, 
    selectedHour,
    setSelectedHour,
    hoveredDate, 
    setHoveredDate,
    visibleDateRange,
    setVisibleDateRange,
    timeReference
  } = useCalendar()
  const mountId = useRef(Math.random().toString(36).substr(2, 5))

  // Calculate start date for calendar (Monday before the visible start)
  const calendarStartDate = useMemo(() => {
    if (!visibleDateRange.start) return getCalendarStartDate()
    // Get the Monday of the week containing the visible start date
    const weekStart = startOfWeek(visibleDateRange.start, { weekStartsOn: 1 })
    // Return the day before Monday (Sunday) for generateWeek function
    return new Date(weekStart.getTime() - 24 * 60 * 60 * 1000)
  }, [visibleDateRange.start])

  // Generate weeks based on visible date range (expands with infinite scroll)
  // All weeks are rendered in DOM, but only 5 are visible initially
  const weeks = useMemo(() => {
    if (!visibleDateRange.start || !visibleDateRange.end) return []
    
    // Calculate number of weeks to show based on the full visible range
    const start = calendarStartDate
    const end = visibleDateRange.end
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const numberOfWeeks = Math.ceil(diffDays / 7) + 1 // +1 to ensure we cover the end date
    
    return generateWeeks(start, numberOfWeeks)
  }, [calendarStartDate, visibleDateRange])


  // Scroll to a specific date
  // Use getElementById instead of querySelector for IDs that start with numbers
  const scrollToDate = useCallback((date) => {
    if (!scrollContainerRef.current || !calendarTableRef.current) {
      console.log('[scrollToDate] Refs not available')
      return
    }
    
    const dateId = formatDateId(date)
    console.log('[scrollToDate] Looking for date:', dateId)
    
    // Use getElementById which works with IDs starting with numbers
    // Or escape the selector for querySelector
    const dayElement = calendarTableRef.current.getElementById?.(dateId) || 
                       calendarTableRef.current.querySelector(`[id="${dateId}"]`)
    
    const container = scrollContainerRef.current

    // Helper to scroll to a specific row (week), keeping the whole expanded week in view
    const scrollRowIntoView = (row) => {
      if (!row || !container) return
      const rowTop = row.offsetTop
      const rowHeight = row.offsetHeight
      const containerHeight = container.clientHeight

      // Center the row within the scroll container
      // so the full expanded week is visible and not scrolled past.
      const extraSpace = Math.max(0, (containerHeight - rowHeight) / 2)
      const scrollTop = rowTop - extraSpace
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      })
      console.log('[scrollToDate] Scrolled row to top:', scrollTop, 'rowTop:', rowTop)
    }

    if (dayElement) {
      console.log('[scrollToDate] Found element, scrolling to:', dateId)

      // Prefer aligning the zoomed week row if present, so the expanded week is fully in view
      if (zoomedWeekId) {
        const zoomedRow = calendarTableRef.current.querySelector(`[id="${zoomedWeekId}"]`)
        if (zoomedRow) {
          scrollRowIntoView(zoomedRow)
          return
        }
      }

      // Fallback: scroll based on the row containing this day
      const row = dayElement.closest('tr')
      if (row) {
        scrollRowIntoView(row)
      } else {
        // Fallback to scrollIntoView
        dayElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
      }
    } else {
      console.log('[scrollToDate] Element not found for date:', dateId)
      // Try again after a short delay in case DOM isn't ready
      setTimeout(() => {
        const retryElement = calendarTableRef.current?.getElementById?.(dateId) ||
                             calendarTableRef.current?.querySelector(`[id="${dateId}"]`)
        if (retryElement && scrollContainerRef.current) {
          console.log('[scrollToDate] Found element on retry, scrolling')

          // Again, prefer the zoomed week row if available
          if (zoomedWeekId) {
            const zoomedRow = calendarTableRef.current?.querySelector(`[id="${zoomedWeekId}"]`)
            if (zoomedRow) {
              scrollRowIntoView(zoomedRow)
              return
            }
          }

          const row = retryElement.closest('tr')
          if (row) {
            scrollRowIntoView(row)
          }
        }
      }, 100)
    }
  }, [zoomedWeekId])

  // Zoom to a date range (scroll to start and highlight range)
  const zoomToDateRange = (range) => {
    if (!range) return
    
    if (range.date) {
      // Single date - scroll to it
      scrollToDate(range.date)
    } else if (range.start) {
      // Date range - scroll to start date
      scrollToDate(range.start)
    }
  }

  // Initialize calendar on mount
  useEffect(() => {
    if (isMounted.current) {
      console.log('Calendar already mounted, skipping initialization')
      return
    }
    isMounted.current = true

    try {
      // Initialize visible date range to show 10 weeks (2 before, current week, 7 after) for fast scrolling
      // This pre-renders more weeks in the DOM for better scroll performance
      const weekRange = getCurrentWeekVisibleRange(2, 7) // 2 weeks before, 7 weeks after = 10 total
      
      setVisibleDateRange({
        start: weekRange.start,
        end: weekRange.end
      })

      console.log(`[CalendarView][${mountId.current}] Calendar initialized with range:`, weekRange.start, 'to', weekRange.end, `(${Math.ceil((weekRange.end - weekRange.start) / (1000 * 60 * 60 * 24) / 7)} weeks)`)
    } catch (err) {
      console.error('Error initializing calendar:', err)
      setError('Error initializing calendar: ' + err.message)
    }

    // Cleanup on unmount
    return () => {
      isMounted.current = false
    }
  }, [])

  // Scroll to position showing current week (Monday of current week) as the first visible week
  // Use week ID to find the row directly (like the original calendar.js)
  const hasInitializedScroll = useRef(false)
  useEffect(() => {
    if (weeks.length >= 10 && !hasInitializedScroll.current && scrollContainerRef.current && calendarTableRef.current) {
      // Small delay to ensure DOM is fully rendered and heights are calculated
      const timer = setTimeout(() => {
        // Get Monday of current week
        const today = new Date()
        const currentWeekMonday = startOfWeek(today, { weekStartsOn: 1 })
        const weekId = getWeekId(currentWeekMonday)
        // Use attribute selector for IDs that start with numbers
        const weekRow = calendarTableRef.current.querySelector(`[id="${weekId}"]`)
        
        if (weekRow && scrollContainerRef.current) {
          const container = scrollContainerRef.current
          
          // Scroll so that the current week row is at the top of the viewport
          const rowTop = weekRow.offsetTop
          container.scrollTop = rowTop
          console.log('[CalendarView] Initial scroll set to show current week. scrollTop:', container.scrollTop, 'rowTop:', rowTop, 'weekId:', weekId)
          hasInitializedScroll.current = true
        }
      }, 300) // Increased delay to ensure layout is complete
      return () => clearTimeout(timer)
    }
  }, [weeks.length])

  // Infinite scroll: load more weeks when scrolling near boundaries
  const isLoadingWeeks = useRef(false)
  
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      if (isLoadingWeeks.current) return

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const scrollBottom = scrollHeight - scrollTop - clientHeight
      const threshold = 500 // pixels from edge to trigger load

      // Load more past weeks when scrolling near top
      if (scrollTop < threshold && visibleDateRange.start) {
        isLoadingWeeks.current = true
        const newStart = addDays(visibleDateRange.start, -14) // Load 2 weeks before
        const weekStart = startOfWeek(newStart, { weekStartsOn: 1 })
        
        console.log('[CalendarView] Loading past weeks, new start:', weekStart)
        setVisibleDateRange(prev => ({
          ...prev,
          start: weekStart
        }))
        
        // Reset loading flag after a delay
        setTimeout(() => {
          isLoadingWeeks.current = false
        }, 300)
      }

      // Load more future weeks when scrolling near bottom
      if (scrollBottom < threshold && visibleDateRange.end) {
        isLoadingWeeks.current = true
        const newEnd = addDays(visibleDateRange.end, 14) // Load 2 weeks after
        const weekEnd = endOfWeek(newEnd, { weekStartsOn: 1 })
        
        console.log('[CalendarView] Loading future weeks, new end:', weekEnd)
        setVisibleDateRange(prev => ({
          ...prev,
          end: weekEnd
        }))
        
        // Reset loading flag after a delay
        setTimeout(() => {
          isLoadingWeeks.current = false
        }, 300)
      }
    }

    // Use passive listener for better performance
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [visibleDateRange, setVisibleDateRange])

  // Handle day click
  const handleDayClick = (date) => {
    console.log('[CalendarView] Day clicked:', date)

    // Clear selected hour when clicking a day (user is selecting a new day)
    setSelectedHour(null)

    // Set zoomed week based on the clicked date
    const weekId = getWeekId(date)
    setZoomedWeekId(weekId)

    // Try to map clicked date to one of the known sidebar time references
    const matchedRefId = getTimeReferenceIdForDate(date)

    if (matchedRefId) {
      // Use existing time reference flow so sidebar + URL + header all stay in sync
      updateTimeSelection(matchedRefId, 'calendar-click')
    } else {
      // Fallback: use a custom single-date reference "date-YYYY-MM-DD"
      const customRef = `date-${formatDateId(date)}`
      updateTimeSelection(customRef, 'calendar-click')
    }
  }

  // Handle day hover
  const handleDayHover = (date) => {
    setHoveredDate(date)
  }

  // Handle day leave
  const handleDayLeave = () => {
    setHoveredDate(null)
  }

  // Handle hour click
  const handleHourClick = (date, hour) => {
    console.log('[CalendarView] Hour clicked:', date, hour)
    
    // Set the selected date if not already set
    if (!selectedDate || formatDateId(selectedDate) !== formatDateId(date)) {
      // Try to map clicked date to one of the known sidebar time references
      const matchedRefId = getTimeReferenceIdForDate(date)
      
      if (matchedRefId) {
        updateTimeSelection(matchedRefId, 'calendar-click')
      } else {
        // Fallback: use a custom single-date reference "date-YYYY-MM-DD"
        const customRef = `date-${formatDateId(date)}`
        updateTimeSelection(customRef, 'calendar-click')
      }
    }
    
    // Set the selected hour
    setSelectedHour(hour)
  }

  // Set CSS variables for header height
  useEffect(() => {
    if (calendarTableRef.current && scrollContainerRef.current) {
      // Calculate viewport-based heights for minimum row size
      const container = scrollContainerRef.current
      if (container) {
        const containerHeight = container.clientHeight
        const monthNav = document.querySelector('.calendar-month-nav')
        const monthNavHeight = monthNav ? monthNav.offsetHeight : 60
        const header = document.querySelector('.header')
        const headerHeight = header ? header.offsetHeight : 60
        
        calendarTableRef.current.style.setProperty('--header-height', `${headerHeight}px`)
        calendarTableRef.current.style.setProperty('--month-nav-height', `${monthNavHeight}px`)
        calendarTableRef.current.style.setProperty('--thead-height', '0px') // No thead anymore
      }
    }
  }, [weeks.length])

  // Expose zoom functions globally (similar to window.zoomToAreaById)
  useEffect(() => {
    window.zoomToTimeReference = (timeRef, range) => {
      console.log('[CalendarView] zoomToTimeReference called:', timeRef, range)
      if (timeRef === 'today') {
        // For "today", scroll directly to today's date
        scrollToDate(new Date())
      } else if (range) {
        zoomToDateRange(range)
      }
    }

    window.resetCalendarZoom = () => {
      console.log('[CalendarView] resetCalendarZoom called')
      // Scroll to today
      scrollToDate(new Date())
    }

    // Cleanup
    return () => {
      delete window.zoomToTimeReference
      delete window.resetCalendarZoom
    }
  }, [scrollToDate])

  // Handle time reference changes from context
  useEffect(() => {
    if (timeReference && timeReference !== 'all-upcoming') {
      const range = getTimeReferenceRange(timeReference)
      if (range) {
        // Update zoomed week based on the primary date for this reference
        const primaryDate = range.date || range.start
        if (primaryDate) {
          const weekId = getWeekId(primaryDate)
          setZoomedWeekId(weekId)
        }

        // Small delay to ensure DOM and zoom styles are ready
        setTimeout(() => {
          if (timeReference === 'today') {
            // For "today", scroll directly to today's date
            scrollToDate(new Date())
          } else if (primaryDate) {
            // For other time references, scroll to the primary date
            scrollToDate(primaryDate)
          } else if (range.start) {
            zoomToDateRange(range)
          }
        }, 120)
      }
    } else if (!timeReference || timeReference === 'all-upcoming') {
      // Clear zoom when resetting time reference
      setZoomedWeekId(null)
    }
  }, [timeReference, scrollToDate])

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        color: 'red',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <h3>Calendar Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              marginTop: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="calendar-view"
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Month Navigation with weekday labels */}
      <div className="calendar-month-nav" style={{
        padding: '0.75rem 0.5rem',
        borderBottom: '1px solid #e2e2e2',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{
          display: 'flex',
          width: '100%'
        }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <div
              key={day}
              style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: '#666',
                padding: '0.5rem 0'
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Calendar Container */}
      <div 
        ref={scrollContainerRef}
        className="calendar-scroll-container"
        style={{ 
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative'
        }}
      >
        {/* Calendar Table */}
        <table 
          ref={calendarTableRef}
          id="calendarTable"
          className="calendar-table"
          data-num-weeks={weeks.length}
          style={{ 
            width: '100%',
            minHeight: '100%',
            borderCollapse: 'collapse'
          }}
        >
          <CalendarGrid
            weeks={weeks}
            selectedDate={selectedDate}
            selectedDateRange={selectedDateRange}
            selectedHour={selectedHour}
            hoveredDate={hoveredDate}
            onDayClick={handleDayClick}
            onDayHover={handleDayHover}
            onDayLeave={handleDayLeave}
            onHourClick={handleHourClick}
            zoomedWeekId={zoomedWeekId}
          />
        </table>
      </div>
    </div>
  )
}
