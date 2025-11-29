import React from 'react'
import { useNavigate } from 'react-router-dom'
import './ActivityView.css'

const activities = [
  { id: 'climbing', name: 'Rock Climbing', icon: '🧗' },
  { id: 'biking', name: 'Mountain Biking', icon: '🚵' },
  { id: 'hiking', name: 'Hiking', icon: '🥾' },
  { id: 'running', name: 'Running', icon: '🏃' }
]

export default function ActivityView() {
  const navigate = useNavigate()

  const handleActivitySelect = (activity) => {
    // Navigate to the activity-specific location picker
    if (activity.id === 'climbing') {
      navigate('/map/climbing')
    } else {
      // For other activities, we'll implement their specific views later
      navigate('/')
    }
  }

  return (
    <div className="activity-view">
      <h2>What would you like to do?</h2>
      <div className="activity-grid">
        {activities.map(activity => (
          <button
            key={activity.id}
            className="activity-card"
            onClick={() => handleActivitySelect(activity)}
          >
            <span className="activity-icon">{activity.icon}</span>
            <span className="activity-name">{activity.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
} 