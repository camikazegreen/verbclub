import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LoginModal.css'

export default function LoginModal() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const baseUrl = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? 'https://localhost:3000' : 'http://localhost:3000')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let result
      if (isLogin) {
        result = await login(username, password)
      } else {
        result = await register(username, password, phoneNumber || undefined)
      }

      if (result.success) {
        // Close modal by navigating away
        navigate(location.state?.from?.pathname || '/')
      } else {
        setError(result.error || 'An error occurred')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = (provider) => {
    window.location.href = `${baseUrl}/auth/${provider}`
  }

  const handleClose = () => {
    navigate(location.state?.from?.pathname || '/')
  }

  return (
    <div className="login-modal">
      <div className="login-modal-header">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        <button className="login-modal-close" onClick={handleClose}>×</button>
      </div>

      <div className="login-modal-content">
        {error && <div className="login-modal-error">{error}</div>}

        {/* OAuth Buttons */}
        <div className="login-oauth-buttons">
          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <button
              type="button"
              className="oauth-button oauth-google"
              onClick={() => handleOAuth('google')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          )}

          {import.meta.env.VITE_FACEBOOK_CLIENT_ID && (
            <button
              type="button"
              className="oauth-button oauth-facebook"
              onClick={() => handleOAuth('facebook')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M18 9a9 9 0 1 0-10.406 8.89v-6.288H5.309V9h2.285V7.017c0-2.255 1.343-3.501 3.4-3.501.984 0 2.014.175 2.014.175v2.215h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.494l-.399 2.602h-2.095v6.288A9.001 9.001 0 0 0 18 9z"/>
              </svg>
              Continue with Facebook
            </button>
          )}

          {import.meta.env.VITE_APPLE_CLIENT_ID && (
            <button
              type="button"
              className="oauth-button oauth-apple"
              onClick={() => handleOAuth('apple')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M13.562 1.58c.936 1.128 2.505 1.936 3.938 1.81-.175 1.32-.537 2.64-1.146 3.78-.618 1.15-1.44 2.17-2.468 3.05-.984.84-2.14 1.28-3.28 1.23-.936-.05-1.44-.537-2.376-.537-.945 0-1.5.497-2.436.547-1.08.06-2.28-.55-3.28-1.41-1.78-1.54-3.15-4.35-2.64-6.99.51-2.64 2.37-4.44 4.14-5.38 1.03-.6 2.28-.94 3.48-.9.99.03 1.92.35 2.76.68.84.32 1.62.62 2.28.62.64 0 1.35-.28 2.19-.58.42-.15.87-.31 1.35-.46-.44-.68-1.01-1.3-1.61-1.78zM11.74.42c.25.29.47.62.66.98-.6.27-1.11.69-1.48 1.19-.27-.25-.5-.54-.68-.87.6-.28 1.12-.7 1.5-1.3z"/>
              </svg>
              Continue with Apple
            </button>
          )}
        </div>

        {(import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_FACEBOOK_CLIENT_ID || import.meta.env.VITE_APPLE_CLIENT_ID) && (
          <div className="login-divider">
            <span>or</span>
          </div>
        )}

        {/* Username/Password Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="phone">Phone Number (optional)</label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 555 123 4567"
                autoComplete="tel"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="login-toggle">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button type="button" onClick={() => setIsLogin(false)}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setIsLogin(true)}>
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

