import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useFilters } from '../contexts/FiltersContext'
import Modal from '../components/Modal'
import AddPersonModal from '../components/AddPersonModal'
import './PeopleView.css'

export default function PeopleView() {
  const { token, isAuthenticated } = useAuth()
  const { selectedPeople, setSelectedPeople } = useFilters()
  const [friends, setFriends] = useState([])
  const [otherPeople, setOtherPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddPersonModal, setShowAddPersonModal] = useState(false)

  const handlePersonClick = (person) => {
    setSelectedPeople(prev => {
      // Toggle: if person is already selected, remove them; otherwise add them
      const isSelected = prev.some(p => p.id === person.id)
      if (isSelected) {
        return prev.filter(p => p.id !== person.id)
      } else {
        return [...prev, person]
      }
    })
  }

  const isPersonSelected = (personId) => {
    return selectedPeople.some(p => p.id === personId)
  }

  const fetchPeople = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const apiUrl = import.meta.env.VITE_API_URL || ''

      // Fetch friends
      const friendsResponse = await fetch(`${apiUrl}/api/people/me/connections`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!friendsResponse.ok) {
        throw new Error('Failed to fetch friends')
      }

      const friendsData = await friendsResponse.json()
      setFriends(friendsData)

      // Fetch other people
      const peopleResponse = await fetch(`${apiUrl}/api/people`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!peopleResponse.ok) {
        throw new Error('Failed to fetch people')
      }

      const peopleData = await peopleResponse.json()
      setOtherPeople(peopleData)

    } catch (err) {
      console.error('Error fetching people:', err)
      setError(err.message || 'Failed to load people')
    } finally {
      setLoading(false)
    }
  }, [token, isAuthenticated])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  const handleAddPersonSuccess = () => {
    // Refresh the people list
    fetchPeople()
  }

  if (!isAuthenticated) {
    return (
      <div className="people-view">
        <div className="people-view-message">
          <p>Please log in to view people.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="people-view">
        <div className="people-view-message">
          <p>Loading people...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="people-view">
        <div className="people-view-message">
          <p className="error">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="people-view">
      <div className="people-view-content">
        {/* Friends Section */}
        <section className="people-section">
          <div className="people-section-header">
            <h2 className="people-section-heading">Friends</h2>
            <button 
              className="people-add-button"
              onClick={() => setShowAddPersonModal(true)}
              title="Add Person"
            >
              +
            </button>
          </div>
          {friends.length === 0 ? (
            <p className="people-empty">No friends yet.</p>
          ) : (
            <div className="people-list">
              {friends.map(person => (
                <div 
                  key={person.id} 
                  className={`person-card ${isPersonSelected(person.id) ? 'selected' : ''}`}
                  onClick={() => handlePersonClick(person)}
                >
                  <div className="person-info">
                    <div className="person-name">{person.name}</div>
                    {person.phone_number && (
                      <div className="person-phone">{person.phone_number}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Other People Section */}
        <section className="people-section">
          <h2 className="people-section-heading">Other People</h2>
          {otherPeople.length === 0 ? (
            <p className="people-empty">No other people found.</p>
          ) : (
            <div className="people-list">
              {otherPeople.map(person => (
                <div 
                  key={person.id} 
                  className={`person-card ${isPersonSelected(person.id) ? 'selected' : ''}`}
                  onClick={() => handlePersonClick(person)}
                >
                  <div className="person-info">
                    <div className="person-name">{person.name}</div>
                    {person.phone_number && (
                      <div className="person-phone">{person.phone_number}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showAddPersonModal && (
        <Modal className="no-padding">
          <AddPersonModal
            onClose={() => setShowAddPersonModal(false)}
            onSuccess={handleAddPersonSuccess}
          />
        </Modal>
      )}
    </div>
  )
}
