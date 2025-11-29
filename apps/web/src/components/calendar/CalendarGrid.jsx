import React, { useMemo } from 'react'
import { getWeekId } from '../../utils/dateUtils'
import CalendarDay from './CalendarDay'

export default function CalendarGrid({ 
  weeks, 
  selectedDate, 
  selectedDateRange, 
  selectedHour,
  hoveredDate,
  onDayClick,
  onDayHover,
  onDayLeave,
  onHourClick,
  zoomedWeekId
}) {
  return (
    <tbody>
      {weeks.map((week, weekIndex) => {
        const weekId = getWeekId(week[0])
        const isZoomed = zoomedWeekId && zoomedWeekId === weekId
        return (
          <tr 
            key={weekId} 
            id={weekId}
            className={isZoomed ? 'zoomed-week' : ''}
          >
            {week.map((date) => (
              <CalendarDay
                key={date.toISOString()}
                date={date}
                selectedDate={selectedDate}
                selectedDateRange={selectedDateRange}
                selectedHour={selectedHour}
                hoveredDate={hoveredDate}
                onDayClick={onDayClick}
                onDayHover={onDayHover}
                onDayLeave={onDayLeave}
                onHourClick={onHourClick}
                isZoomedWeek={isZoomed}
              />
            ))}
          </tr>
        )
      })}
    </tbody>
  )
}

