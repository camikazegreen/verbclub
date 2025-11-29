import React, { createContext, useContext, useState } from 'react'

const CalendarContext = createContext()

export function CalendarProvider({ children }) {
  // Selected date or date range
  const [selectedDate, setSelectedDate] = useState(null) // Single date
  const [selectedDateRange, setSelectedDateRange] = useState(null) // { start: Date, end: Date }
  
  // Selected hour (e.g., '10:00 am', '2:00 pm')
  const [selectedHour, setSelectedHour] = useState(null)
  
  // Time reference string (e.g., 'tomorrow', 'this-weekend', 'next-week')
  const [timeReference, setTimeReference] = useState(null)
  
  // Hover state
  const [hoveredDate, setHoveredDate] = useState(null)
  
  // Visible date range in the calendar (for lazy loading)
  const [visibleDateRange, setVisibleDateRange] = useState({
    start: null,
    end: null
  })
  
  // Events cache: Map of date string (YYYY-MM-DD) to events array
  const [events, setEvents] = useState(new Map())
  
  // Track which months have been loaded
  const [loadedMonths, setLoadedMonths] = useState(new Set())

  return (
    <CalendarContext.Provider value={{
      selectedDate,
      setSelectedDate,
      selectedDateRange,
      setSelectedDateRange,
      selectedHour,
      setSelectedHour,
      timeReference,
      setTimeReference,
      hoveredDate,
      setHoveredDate,
      visibleDateRange,
      setVisibleDateRange,
      events,
      setEvents,
      loadedMonths,
      setLoadedMonths
    }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}

