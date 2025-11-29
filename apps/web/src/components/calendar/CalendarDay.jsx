import React from 'react'
import { 
  formatDateId, 
  formatDayName, 
  formatMonthName, 
  formatDayNumber,
  isToday, 
  isPast,
  isOddMonth,
  isInDateRange
} from '../../utils/dateUtils'
import './CalendarDay.css'

const HOURS = [
  '12:00 am',
  '1:00 am',
  '2:00 am',
  '3:00 am',
  '4:00 am',
  '5:00 am',
  '6:00 am',
  '7:00 am',
  '8:00 am',
  '9:00 am',
  '10:00 am',
  '11:00 am',
  '12:00 pm',
  '1:00 pm',
  '2:00 pm',
  '3:00 pm',
  '4:00 pm',
  '5:00 pm',
  '6:00 pm',
  '7:00 pm',
  '8:00 pm',
  '9:00 pm',
  '10:00 pm',
  '11:00 pm'
]

export default function CalendarDay({ 
  date, 
  selectedDate, 
  selectedDateRange, 
  selectedHour,
  hoveredDate,
  onDayClick,
  onDayHover,
  onDayLeave,
  onHourClick,
  isZoomedWeek = false
}) {
  const dateId = formatDateId(date)
  const dayName = formatDayName(date)
  const monthName = formatMonthName(date)
  const dayNumber = formatDayNumber(date)
  const isTodayDate = isToday(date)
  const isPastDate = isPast(date)
  const oddMonth = isOddMonth(date)
  const isSelected = selectedDate && formatDateId(selectedDate) === dateId
  const isInRange = selectedDateRange && isInDateRange(date, selectedDateRange)
  const isHovered = hoveredDate && formatDateId(hoveredDate) === dateId
  
  // A day is "selected" if it's either a single selected date OR part of a selected range
  const isDaySelected = isSelected || isInRange

  // Build CSS classes
  const classes = [
    'calendar-day',
    dayName.toLowerCase(),
    'picker-day',
    oddMonth ? 'odd-month' : 'even-month',
    isTodayDate && 'today',
    isPastDate && 'past-day',
    isDaySelected && 'selected',
    isInRange && 'in-range',
    isHovered && 'hovered',
    isZoomedWeek && 'zoomed-week-cell'
  ].filter(Boolean).join(' ')

  const handleClick = () => {
    if (onDayClick) {
      onDayClick(date)
    }
  }

  const handleMouseEnter = () => {
    if (onDayHover) {
      onDayHover(date)
    }
  }

  const handleMouseLeave = () => {
    if (onDayLeave) {
      onDayLeave()
    }
  }

  const handleHourClick = (e, hour) => {
    e.stopPropagation() // Prevent day click from firing
    if (onHourClick) {
      onHourClick(date, hour)
    }
  }

  const isHourSelected = (hour) => {
    const isDateSelected = isDaySelected
    return isDateSelected && selectedHour === hour
  }

  // Calculate sunrise/sunset percentages for 24-hour day
  // Hardcoded for Tucson: sunrise 7:05am, sunset 5:18pm
  // 7:05am = 7.083 hours = 29.51% of 24h
  // 5:18pm = 17.3 hours = 72.08% of 24h
  const sunrisePct = '29.5%'
  const sunsetPct = '72%'
  const dawnBandPct = '2%' // 2% band around sunrise
  const duskBandPct = '3%' // 3% band around sunset

  return (
    <td
      id={dateId}
      className={classes}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        '--sunrise-pct': sunrisePct,
        '--sunset-pct': sunsetPct,
        '--dawn-band-pct': dawnBandPct,
        '--dusk-band-pct': duskBandPct
      }}
    >
      <a 
        href={`#date-${dateId}`}
        className="day-link"
        onClick={(e) => e.preventDefault()}
      >
        <div className="mon-div">{monthName}</div>
        <div className="day-div">{dayNumber}</div>
        <div className="hours-list">
          {HOURS.map((hour) => {
            const hourSelected = isHourSelected(hour)
            return (
              <div 
                key={hour} 
                className={`hour-slot ${hourSelected ? 'selected-hour' : ''}`}
                onClick={(e) => handleHourClick(e, hour)}
              >
                {hour}
              </div>
            )
          })}
        </div>
      </a>
    </td>
  )
}

