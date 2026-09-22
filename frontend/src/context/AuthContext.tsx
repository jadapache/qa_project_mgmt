import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient, type AuthUser } from '../api/client'
import { AUTH_TOKEN_KEY } from '../constants/app'

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string, fullName?: string) => Promise<{ status?: string; message?: string; token?: string; user?: AuthUser }>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = AUTH_TOKEN_KEY

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (!storedToken) {
        setIsLoading(false)
        return
      }
      try {
        const res = await apiClient.getMe()
        setUser(res.user)
        setToken(storedToken)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.login({ username, password })
      if (res.token) {
        localStorage.setItem(TOKEN_KEY, res.token)
        setToken(res.token)
        setUser(res.user)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (username: string, password: string, email?: string, fullName?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.register({
        username,
        password,
        email,
        full_name: fullName,
      })
      if (res.token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.token)
        setToken(res.token)
        setUser(res.user)
      }
      return res
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar acceso'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
