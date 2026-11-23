/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getOrCreateProfile, getProfile } from '../services/proofStakeService'

const UserContext = createContext(null)
const SESSION_KEY = 'proofstake_profile_id'

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [arenaPromptOpen, setArenaPromptOpen] = useState(false)

  const refreshUser = useCallback(async () => {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      setCurrentUser(null)
      return null
    }

    const profile = await getProfile(id)
    if (!profile) {
      localStorage.removeItem(SESSION_KEY)
      setCurrentUser(null)
      return null
    }
    setCurrentUser(profile)
    setSessionError('')
    return profile
  }, [])

  useEffect(() => {
    refreshUser()
      .catch(error => setSessionError(`Could not restore your player session: ${error.message}`))
      .finally(() => setLoadingUser(false))
  }, [refreshUser])

  const loginOrCreateUser = async username => {
    const profile = await getOrCreateProfile(username)
    localStorage.setItem(SESSION_KEY, profile.id)
    setCurrentUser(profile)
    setSessionError('')
    setArenaPromptOpen(false)
    return profile
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
    setArenaPromptOpen(false)
  }

  return (
    <UserContext.Provider value={{
      currentUser,
      loadingUser,
      sessionError,
      loginOrCreateUser,
      refreshUser,
      logout,
      arenaPromptOpen,
      setArenaPromptOpen,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
