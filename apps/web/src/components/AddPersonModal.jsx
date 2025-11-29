import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './AddPersonModal.css'

export default function AddPersonModal({ onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name.trim() || !phoneNumber.trim()) {
      setError('Name and phone number are required')
      setLoading(false)
      return
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const response = await fetch(`${apiUrl}/api/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          phone_number: phoneNumber.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create person')
      }

      const result = await response.json()
      
      // Show appropriate message based on what happened
      if (result._meta) {
        if (result._meta.connectionExisted) {
          setError('This person is already your friend.')
          setLoading(false)
          return
        } else if (result._meta.personExisted && result._meta.connectionCreated) {
          // Person existed but connection was just created
          // This is fine, continue with success
        }
      }
      
      // Call success callback to refresh the list
      if (onSuccess) {
        onSuccess(result)
      }
      
      // Close modal
      onClose()
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-person-modal">
      <div className="add-person-modal-header">
        <h2>Add Person</h2>
        <button className="add-person-modal-close" onClick={onClose}>×</button>
      </div>

      <div className="add-person-modal-content">
        {error && <div className="add-person-modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="add-person-form">
          <div className="form-group">
            <label htmlFor="person-name">Name *</label>
            <input
              id="person-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="person-phone">Phone Number *</label>
            <input
              id="person-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              placeholder="+1 555 123 4567"
            />
          </div>

          <div className="add-person-modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

