import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useFilters } from '../contexts/FiltersContext'
import { useCalendar } from '../contexts/CalendarContext'
import { useAuth } from '../contexts/AuthContext'
import { getTimeReferenceTextAndDates } from '../utils/dateUtils'
import './Header.css'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedAreaId, areaInfo } = useFilters()
  const { timeReference } = useCalendar()
  const { isAuthenticated, user, logout } = useAuth()
  const [selections, setSelections] = useState({
    activity: '',
    location: '',
    people: '',
    time: ''
  })

  // Update selections based on URL and selected area
  useEffect(() => {
    const path = location.pathname
    if (path.startsWith('/map/climbing')) {
      setSelections(prev => ({
        ...prev,
        activity: 'Rock Climbing'
      }))
    }
  }, [location.pathname])

  // Update location selection when a climbing area is selected
  useEffect(() => {
    if (selectedAreaId && areaInfo[selectedAreaId]) {
      setSelections(prev => ({
        ...prev,
        location: areaInfo[selectedAreaId].name
      }))
    }
  }, [selectedAreaId, areaInfo])

  // Update time selection when calendar time reference changes
  // Also attach the concrete dates array for potential use elsewhere
  const { selectedHour } = useCalendar()
  useEffect(() => {
    const { text, dates } = getTimeReferenceTextAndDates(timeReference, selectedHour)
    setSelections(prev => ({
      ...prev,
      time: text,
      timeDates: dates
    }))
  }, [timeReference, selectedHour])

  const getActiveSection = () => {
    const path = location.pathname
    if (path === '/') return 'activity'
    if (path.startsWith('/map')) return 'location'
    if (path === '/people') return 'people'
    if (path === '/calendar') return 'time'
    return 'activity' // default
  }

  const renderInteractivePart = (type, text) => {
    const isActive = getActiveSection() === type
    const value = selections[type] || text
    const className = `interactive-part ${isActive ? 'active' : ''} ${selections[type] ? 'selected' : ''}`

    const handleClick = () => {
      switch (type) {
        case 'activity':
          navigate('/')
          break
        case 'location':
          if (selections.activity === 'Rock Climbing') {
            navigate('/map/climbing')
          }
          break
        case 'people':
          navigate('/people')
          break
        case 'time':
          navigate('/calendar')
          break
        default:
          navigate('/')
      }
    }

    return (
      <span 
        className={className}
        onClick={handleClick}
      >
        {value}
      </span>
    )
  }

  const handleLoginClick = () => {
    navigate('/login', { state: { from: location } })
  }

  return (
    <header className="header">
      <div className="header-top">
        <h1>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 'inherit',
              color: 'inherit',
              fontFamily: 'inherit',
              fontWeight: 'inherit'
            }}
          >
            Verb Club
          </button>
        </h1>
        <div className="header-auth">
          {isAuthenticated ? (
            <div className="header-user">
              <span>{user?.username || 'User'}</span>
              <button onClick={logout} className="header-logout">Logout</button>
            </div>
          ) : (
            <button onClick={handleLoginClick} className="header-login">Login</button>
          )}
        </div>
      </div>
      <p className="mad-libs">
        I want to {selections.activity ? 'go ' : ''}{renderInteractivePart('activity', 'do something')}{' '}
        {renderInteractivePart('location', 'somewhere')}{' '}
        with {renderInteractivePart('people', 'cool people')}{' '}
        {renderInteractivePart('time', 'soon')}.
      </p>
    </header>
  )
} 