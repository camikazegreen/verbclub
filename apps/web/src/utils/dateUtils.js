import { 
  startOfWeek, 
  addDays, 
  format, 
  isSameDay, 
  isBefore, 
  isAfter,
  startOfDay,
  getWeek,
  getYear,
  startOfMonth,
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
  endOfMonth
} from 'date-fns'

/**
 * Get the start date for calendar (2 months ago, previous Monday)
 */
export function getCalendarStartDate() {
  const today = new Date()
  const twoMonthsAgo = new Date(today)
  twoMonthsAgo.setMonth(today.getMonth() - 2)
  
  // Get the previous Monday (or today if it's Monday)
  const weekStart = startOfWeek(twoMonthsAgo, { weekStartsOn: 1 }) // 1 = Monday
  return addDays(weekStart, -1) // Start from the day before Monday (Sunday)
}

/**
 * Get the visible date range starting from Monday of current week
 * Returns the Monday of the current week and Sunday of the last week
 * @param {number} weeksBefore - Number of weeks before current week to include (default: 2)
 * @param {number} weeksAfter - Number of weeks after current week to include (default: 8, total 10 weeks visible)
 */
export function getCurrentWeekVisibleRange(weeksBefore = 2, weeksAfter = 8) {
  const today = new Date()
  const todayStart = startOfDay(today)
  
  // Get Monday of the current week
  const currentWeekStart = startOfWeek(todayStart, { weekStartsOn: 1 })
  
  // Start from weeksBefore weeks before current week
  const visibleStart = addDays(currentWeekStart, -(weeksBefore * 7))
  
  // End at weeksAfter weeks after current week (total weeks = weeksBefore + 1 + weeksAfter)
  const visibleEnd = addDays(currentWeekStart, (weeksAfter * 7) + 6) // +6 to get Sunday of that week
  
  return { start: visibleStart, end: visibleEnd }
}

/**
 * Generate a week of dates starting from a given date
 * Returns array of 7 Date objects (Monday through Sunday)
 */
export function generateWeek(startDate) {
  const week = []
  for (let i = 0; i < 7; i++) {
    week.push(addDays(startDate, i + 1)) // +1 because startDate is the day before Monday (Sunday)
  }
  return week
}

/**
 * Generate multiple weeks starting from a date
 */
export function generateWeeks(startDate, numberOfWeeks = 20) {
  const weeks = []
  let currentWeekStart = startDate
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const week = generateWeek(currentWeekStart)
    weeks.push(week)
    currentWeekStart = addDays(currentWeekStart, 7)
  }
  
  return weeks
}

/**
 * Format date as yyyy-MM-dd (for IDs and keys)
 */
export function formatDateId(date) {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Format date as day name (e.g., "Monday")
 */
export function formatDayName(date) {
  return format(date, 'EEEE')
}

/**
 * Format date as month abbreviation (e.g., "Jan")
 */
export function formatMonthName(date) {
  return format(date, 'MMM')
}

/**
 * Format date as day number (e.g., "15")
 */
export function formatDayNumber(date) {
  return format(date, 'dd')
}

/**
 * Check if date is today
 */
export function isToday(date) {
  return isSameDay(date, new Date())
}

/**
 * Check if date is in the past
 */
export function isPast(date) {
  return isBefore(startOfDay(date), startOfDay(new Date()))
}

/**
 * Check if date is in a date range
 */
export function isInDateRange(date, range) {
  if (!range || !range.start || !range.end) return false
  const dateStart = startOfDay(date)
  const rangeStart = startOfDay(range.start)
  const rangeEnd = startOfDay(range.end)
  return (dateStart >= rangeStart && dateStart <= rangeEnd)
}

/**
 * Get week ID (yyyyweek##)
 */
export function getWeekId(date) {
  const year = getYear(date)
  const week = getWeek(date, { weekStartsOn: 1 }) // Monday start
  return `${year}week${week}`
}

/**
 * Check if month number is odd (for styling)
 */
export function isOddMonth(date) {
  const month = parseInt(format(date, 'MM'))
  return month % 2 === 1
}

/**
 * Get date range for a time reference
 * Returns { start: Date, end: Date } or { date: Date } for single dates
 */
export function getTimeReferenceRange(reference) {
  const today = new Date()
  const todayStart = startOfDay(today)

  // Custom single-date reference: "date-YYYY-MM-DD"
  if (reference && reference.startsWith('date-')) {
    const iso = reference.slice(5) // remove "date-"
    const [yearStr, monthStr, dayStr] = iso.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10) - 1 // JS months 0-based
    const day = parseInt(dayStr, 10)
    const customDate = new Date(year, month, day)
    if (!isNaN(customDate.getTime())) {
      return { date: startOfDay(customDate) }
    }
  }
  
  switch (reference) {
    case 'today':
      return { date: todayStart }
    
    case 'tomorrow':
      return { date: addDays(todayStart, 1) }
    
    case 'this-weekend': {
      const thisWeekStart = startOfWeek(todayStart, { weekStartsOn: 1 }) // Monday
      const saturday = addDays(thisWeekStart, 5) // Saturday (5 days after Monday)
      const sunday = addDays(thisWeekStart, 6) // Sunday (6 days after Monday)
      return { start: saturday, end: sunday }
    }
    
    case 'next-weekend': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7) // Next Monday
      const saturday = addDays(nextWeekStart, 5) // Saturday
      const sunday = addDays(nextWeekStart, 6) // Sunday
      return { start: saturday, end: sunday }
    }
    
    case 'this-week': {
      const weekStart = startOfWeek(todayStart, { weekStartsOn: 1 }) // Monday
      const weekEnd = endOfWeek(todayStart, { weekStartsOn: 1 }) // Sunday
      return { start: weekStart, end: weekEnd }
    }
    
    case 'next-week': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7) // Next Monday
      const nextWeekEnd = addDays(nextWeekStart, 6) // Next Sunday
      return { start: nextWeekStart, end: nextWeekEnd }
    }
    
    case 'this-month': {
      const monthStart = startOfMonth(todayStart)
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      return { start: monthStart, end: monthEnd }
    }
    
    case 'next-month': {
      const nextMonthStart = startOfMonth(addDays(todayStart, 32))
      const nextMonthEnd = new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth() + 1, 0)
      return { start: nextMonthStart, end: nextMonthEnd }
    }
    
    // Individual days for this weekend
    case 'this-weekend-saturday': {
      const thisWeekStart = startOfWeek(todayStart, { weekStartsOn: 1 })
      return { date: addDays(thisWeekStart, 5) } // Saturday
    }
    
    case 'this-weekend-sunday': {
      const thisWeekStart = startOfWeek(todayStart, { weekStartsOn: 1 })
      return { date: addDays(thisWeekStart, 6) } // Sunday
    }
    
    // Individual days for next week
    case 'next-week-monday': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7)
      return { date: nextWeekStart } // Monday
    }
    
    case 'next-week-tuesday': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7)
      return { date: addDays(nextWeekStart, 1) } // Tuesday
    }
    
    case 'next-week-wednesday': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7)
      return { date: addDays(nextWeekStart, 2) } // Wednesday
    }
    
    case 'next-week-thursday': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7)
      return { date: addDays(nextWeekStart, 3) } // Thursday
    }
    
    case 'next-week-friday': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7)
      return { date: addDays(nextWeekStart, 4) } // Friday
    }
    
    // Individual days for next weekend
    case 'next-weekend-saturday': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7)
      return { date: addDays(nextWeekStart, 5) } // Saturday
    }
    
    case 'next-weekend-sunday': {
      const nextWeekStart = addDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 7)
      return { date: addDays(nextWeekStart, 6) } // Sunday
    }
    
    default:
      return null
  }
}

/**
 * Get list of available time references with hierarchical structure
 */
export function getTimeReferences() {
  return [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { 
      id: 'this-weekend', 
      label: 'This Weekend',
      children: [
        { id: 'this-weekend-saturday', label: 'Saturday' },
        { id: 'this-weekend-sunday', label: 'Sunday' }
      ]
    },
    { 
      id: 'next-week', 
      label: 'Next Week',
      children: [
        { id: 'next-week-monday', label: 'Monday' },
        { id: 'next-week-tuesday', label: 'Tuesday' },
        { id: 'next-week-wednesday', label: 'Wednesday' },
        { id: 'next-week-thursday', label: 'Thursday' },
        { id: 'next-week-friday', label: 'Friday' }
      ]
    },
    { 
      id: 'next-weekend', 
      label: 'Next Weekend',
      children: [
        { id: 'next-weekend-saturday', label: 'Saturday' },
        { id: 'next-weekend-sunday', label: 'Sunday' }
      ]
    },
    { id: 'next-month', label: 'Next Month' }
  ]
}

/**
 * Given a specific date, return the best matching time reference ID
 * used by the sidebar, if any. Otherwise returns null.
 */
export function getTimeReferenceIdForDate(date) {
  if (!date) return null

  const today = startOfDay(new Date())
  const d = startOfDay(date)

  // Exact matches
  if (isSameDay(d, today)) return 'today'
  if (isSameDay(d, addDays(today, 1))) return 'tomorrow'

  // This weekend (Saturday, Sunday)
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const thisSaturday = addDays(thisWeekStart, 5)
  const thisSunday = addDays(thisWeekStart, 6)
  if (isSameDay(d, thisSaturday)) return 'this-weekend-saturday'
  if (isSameDay(d, thisSunday)) return 'this-weekend-sunday'

  // Next week (Monday–Friday)
  const nextWeekStart = addDays(thisWeekStart, 7) // Next Monday
  const nextWeekDays = [
    { offset: 0, id: 'next-week-monday' },
    { offset: 1, id: 'next-week-tuesday' },
    { offset: 2, id: 'next-week-wednesday' },
    { offset: 3, id: 'next-week-thursday' },
    { offset: 4, id: 'next-week-friday' }
  ]
  for (const { offset, id } of nextWeekDays) {
    if (isSameDay(d, addDays(nextWeekStart, offset))) {
      return id
    }
  }

  // Next weekend (Saturday, Sunday)
  const nextSaturday = addDays(nextWeekStart, 5)
  const nextSunday = addDays(nextWeekStart, 6)
  if (isSameDay(d, nextSaturday)) return 'next-weekend-saturday'
  if (isSameDay(d, nextSunday)) return 'next-weekend-sunday'

  return null
}

/**
 * Get colloquial text and date array for a time reference
 * Returns { text: string, dates: Date[] }
 * 
 * Examples:
 * - "this-weekend" → { text: "this weekend", dates: [saturday, sunday] }
 * - "this-weekend-saturday" → { text: "this Saturday", dates: [saturday] }
 * - "next-week-monday" → { text: "next Monday", dates: [monday] }
 * - "tomorrow" with hour "10:00 am" → { text: "tomorrow at 10am", dates: [tomorrow] }
 */
export function getTimeReferenceTextAndDates(timeReference, selectedHour = null) {
  if (!timeReference) {
    return { text: 'soon', dates: [] }
  }

  // Custom single-date reference: "date-YYYY-MM-DD"
  if (timeReference.startsWith('date-')) {
    const iso = timeReference.slice(5)
    const [yearStr, monthStr, dayStr] = iso.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10) - 1
    const day = parseInt(dayStr, 10)
    const customDate = new Date(year, month, day)
    if (!isNaN(customDate.getTime())) {
      let baseText = format(customDate, 'EEEE, MMMM do')
      // Format hour if provided
      let hourText = ''
      if (selectedHour) {
        hourText = selectedHour.replace(':00', '').toLowerCase()
      }
      const text = hourText ? `${baseText} at ${hourText}` : baseText
      return {
        text,
        dates: [startOfDay(customDate)]
      }
    }
  }

  const range = getTimeReferenceRange(timeReference)
  if (!range) {
    return { text: 'soon', dates: [] }
  }

  // Handle single dates
  if (range.date) {
    const date = range.date
    const dayName = format(date, 'EEEE') // Full day name (Monday, Tuesday, etc.)
    
    // Format hour if provided (convert "10:00 am" to "10am", "2:00 pm" to "2pm")
    let hourText = ''
    if (selectedHour) {
      // Remove ":00" and convert to lowercase for cleaner display
      hourText = selectedHour.replace(':00', '').toLowerCase()
    }
    
    // Determine if it's "this" or "next" based on the time reference ID
    let baseText = ''
    if (timeReference.startsWith('this-')) {
      baseText = `this ${dayName}`
    } else if (timeReference.startsWith('next-')) {
      baseText = `next ${dayName}`
    } else if (timeReference === 'today') {
      baseText = 'today'
    } else if (timeReference === 'tomorrow') {
      baseText = 'tomorrow'
    } else if (timeReference.startsWith('date-')) {
      // Custom date format: "Wednesday, December 10th"
      baseText = format(date, 'EEEE, MMMM do')
    }
    
    // Append hour if provided
    const text = hourText ? `${baseText} at ${hourText}` : baseText
    return { text, dates: [date] }
  }

  // Handle date ranges
  if (range.start && range.end) {
    const dates = []
    let current = new Date(range.start)
    const end = new Date(range.end)
    
    // Generate array of all dates in the range
    while (current <= end) {
      dates.push(new Date(current))
      current = addDays(current, 1)
    }

    // Determine colloquial text based on time reference
    if (timeReference === 'this-weekend') {
      return { text: 'this weekend', dates }
    } else if (timeReference === 'next-weekend') {
      return { text: 'next weekend', dates }
    } else if (timeReference === 'next-week') {
      return { text: 'next week', dates }
    } else if (timeReference === 'next-month') {
      return { text: 'next month', dates }
    } else if (timeReference === 'this-week') {
      return { text: 'this week', dates }
    } else if (timeReference === 'this-month') {
      return { text: 'this month', dates }
    }
  }

  // Fallback
  return { text: 'soon', dates: [] }
}

