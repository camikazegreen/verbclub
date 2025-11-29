import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFilters } from '../contexts/FiltersContext'

export const useAreaStateService = () => {
  const navigate = useNavigate()
  const { selectedAreaId, setSelectedAreaId, areaInfo } = useFilters()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const hasInitialized = useRef(false)

  const updateAreaState = async (newAreaId, source) => {
    console.log(`[updateAreaState] called from ${source} with newAreaId=${newAreaId}, selectedAreaId=${selectedAreaId}, pathname=${window.location.pathname}`)
    console.trace();
    if (isUpdating) {
      console.log('[updateAreaState] Update in progress, skipping')
      return
    }
    
    const hasStateChanged = 
      (selectedAreaId === null && newAreaId === null) ? false :
      (selectedAreaId === null && newAreaId !== null) ? true :
      (selectedAreaId !== null && newAreaId === null) ? true :
      selectedAreaId !== newAreaId

    const needsInitialization = !isInitialized && newAreaId === null

    if (!hasStateChanged && !needsInitialization) {
      console.log(`[updateAreaState] No state change needed: ${selectedAreaId} -> ${newAreaId}`)
      return
    }

    console.log(`[updateAreaState] ${needsInitialization ? 'Initializing' : 'Updating'} area state: ${selectedAreaId} -> ${newAreaId} (source: ${source})`)
    
    setIsUpdating(true)
    try {
      const newPath = newAreaId ? `/map/climbing/${newAreaId}` : '/map/climbing'
      if (window.location.pathname !== newPath) {
        console.log(`[updateAreaState] Navigating to ${newPath}`)
        navigate(newPath)
      } else {
        console.log('[updateAreaState] No navigation needed, already at correct path')
      }

      if (hasStateChanged) {
        console.log(`[updateAreaState] Setting selectedAreaId to ${newAreaId}`)
        setSelectedAreaId(newAreaId)
      } else {
        console.log('[updateAreaState] No selectedAreaId update needed')
      }

      if (window.zoomToAreaById) {
        console.log(`[updateAreaState] Calling zoomToAreaById(${newAreaId})`)
        window.zoomToAreaById(newAreaId)
      } else {
        console.log('[updateAreaState] window.zoomToAreaById not available')
      }

      if (!isInitialized) {
        setIsInitialized(true)
        console.log('[updateAreaState] Marked as initialized')
      }

    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    console.log('[areaStateService] useEffect for initial load running')
    if (hasInitialized.current) return
    hasInitialized.current = true

    const path = window.location.pathname
    let areaId = null
    if (path.startsWith('/map/climbing/')) {
      areaId = path.split('/')[3]
    }
    if (selectedAreaId !== areaId) {
      console.log(`[areaStateService] Initial effect: selectedAreaId (${selectedAreaId}) !== areaId from URL (${areaId}), calling updateAreaState`)
      updateAreaState(areaId, 'initial-url')
    } else {
      console.log('[areaStateService] Initial effect: selectedAreaId matches areaId from URL, no update needed')
    }
  }, [])

  return {
    selectedAreaId,
    updateAreaState,
    isUpdating,
    isInitialized
  }
} 