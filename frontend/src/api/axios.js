import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

let _accessToken = null
let _refreshPromise = null

export const setAccessToken = (token) => { _accessToken = token }
export const getAccessToken = () => _accessToken
export const clearAccessToken = () => { _accessToken = null }

api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!_refreshPromise) {
          _refreshPromise = _doRefresh()
        }
        await _refreshPromise
        _refreshPromise = null
        original.headers.Authorization = `Bearer ${_accessToken}`
        return api(original)
      } catch {
        _refreshPromise = null
        clearAccessToken()
        localStorage.removeItem('sw_refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

async function _doRefresh() {
  const refresh = localStorage.getItem('sw_refresh_token')
  if (!refresh) throw new Error('No refresh token')
  const res = await axios.post('/api/auth/refresh', null, {
    headers: { Authorization: `Bearer ${refresh}` },
  })
  const { access_token } = res.data.data
  setAccessToken(access_token)
}

export default api
