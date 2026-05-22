import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { setAccessToken, clearAccessToken } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {})
    clearAccessToken()
    localStorage.removeItem('sw_refresh_token')
    setUser(null)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { user: u, access_token, refresh_token } = res.data.data
    setAccessToken(access_token)
    localStorage.setItem('sw_refresh_token', refresh_token)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password })
    const { user: u, access_token, refresh_token } = res.data.data
    setAccessToken(access_token)
    localStorage.setItem('sw_refresh_token', refresh_token)
    setUser(u)
    return u
  }, [])

  const updateProfile = useCallback(async (data) => {
    const res = await api.patch('/auth/me', data)
    setUser(res.data.data)
    return res.data.data
  }, [])

  useEffect(() => {
    const refresh = localStorage.getItem('sw_refresh_token')
    if (!refresh) {
      setLoading(false)
      return
    }
    api.post('/auth/refresh', null, {
      headers: { Authorization: `Bearer ${refresh}` },
    })
      .then(async (res) => {
        const { access_token } = res.data.data
        setAccessToken(access_token)
        const meRes = await api.get('/auth/me')
        setUser(meRes.data.data)
      })
      .catch(() => {
        localStorage.removeItem('sw_refresh_token')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
