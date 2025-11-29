import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useFilters } from '../contexts/FiltersContext'
import { useAreaStateService } from '../services/areaStateService'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const CUSTOM_STYLE = 'mapbox://styles/camikazegreen/cmb9irlzw012n01rfbsrn17rb'

export default function MapView() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [error, setError] = useState(null)
  const [styleLoaded, setStyleLoaded] = useState(false)
  const isMounted = useRef(false)
  const { setVisibleAreas, hoveredId, setHoveredId, selectedAreaId, areaInfo } = useFilters()
  const lastHoveredId = useRef(null)
  const { updateAreaState } = useAreaStateService()
  const mountId = useRef(Math.random().toString(36).substr(2, 5))

  // Helper to update visible areas based on selected area
  const updateVisibleAreas = () => {
    if (!map.current) return
    const features = map.current.queryRenderedFeatures({ layers: ['climbing-areas'] })
    const uniqueAreas = Array.from(new Map(features.map(f => [f.properties.id, {
      id: f.properties.id,
      name: f.properties.name
    }])).values())
    // Sort by name alphabetically with natural number sorting
    uniqueAreas.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    setVisibleAreas(uniqueAreas)
  }

  // Helper to set hover state on a feature
  const setMapFeatureHover = (propertiesId, hover) => {
    if (!map.current) return
    try {
      // Find the feature with matching properties.id
      const features = map.current.queryRenderedFeatures({ layers: ['climbing-areas'] })
      const feature = features.find(f => f.properties.id === propertiesId)
      
      if (feature) {
        map.current.setFeatureState(
          { source: 'composite', sourceLayer: 'climbing_areas', id: feature.id },
          { hover }
        )
      } else {
        console.log(`No feature found with properties.id: ${propertiesId}`)
      }
    } catch (e) {
      console.error(`Error setting hover state for feature ${propertiesId}:`, e)
    }
  }

  // Sync hoveredId from context to map feature state
  useEffect(() => {
    if (!map.current) {
      console.log('Map not initialized, skipping hover state update')
      return
    }
    
    // Clear previous hover state
    if (lastHoveredId.current) {
      setMapFeatureHover(lastHoveredId.current, false)
    }
    
    // Set new hover state
    if (hoveredId) {
      setMapFeatureHover(hoveredId, true)
    }
    
    lastHoveredId.current = hoveredId
  }, [hoveredId])

  // Handle selected area changes
  useEffect(() => {
    if (!map.current) return
    
    const handleIdle = () => {
      updateVisibleAreas()
      map.current.off('idle', handleIdle)
    }

    if (selectedAreaId) {
      console.log('Selected area changed:', selectedAreaId)
      // Update filter to show child areas
      map.current.setFilter('climbing-areas', ['==', ['get', 'parent'], selectedAreaId])
      map.current.on('idle', handleIdle)
    } else {
      // Show all level 0 areas
      map.current.setFilter('climbing-areas', ['==', ['get', 'level'], 0])
      map.current.on('idle', handleIdle)
    }
  }, [selectedAreaId])

  // Helper to zoom to a bounding box from areaInfo
  const zoomToAreaBBox = (areaId) => {
    if (!map.current || !areaInfo[areaId] || !areaInfo[areaId].bbox) return
    const [minLng, minLat, maxLng, maxLat] = areaInfo[areaId].bbox
    map.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 800 })
  }

  // Expose zoomToArea for sidebar
  window.zoomToAreaById = (areaId) => {
    if (!map.current) return
    if (areaId === null) {
      // Zoom out to show all level 0 areas
      const level0Areas = Object.values(areaInfo).filter(a => a && a.level === 0 && a.bbox)
      if (level0Areas.length > 0) {
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
        for (const area of level0Areas) {
          const [lng1, lat1, lng2, lat2] = area.bbox
          minLng = Math.min(minLng, lng1)
          minLat = Math.min(minLat, lat1)
          maxLng = Math.max(maxLng, lng2)
          maxLat = Math.max(maxLat, lat2)
        }
        map.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 800 })
      }
    } else if (areaInfo[areaId] && areaInfo[areaId].bbox) {
      zoomToAreaBBox(areaId)
    }
  }

  useEffect(() => {
    // Guard against double mounting
    if (isMounted.current) {
      console.log('Component already mounted, skipping initialization')
      return
    }
    isMounted.current = true
    
    if (map.current) {
      console.log('Map already initialized, skipping initialization')
      return
    }
    
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is missing. Token value:', MAPBOX_TOKEN)
      setError('Mapbox token is missing')
      return
    }

    try {
      // Check for WebGL support
      if (!mapboxgl.supported()) {
        setError('Your browser does not support WebGL, which is required for the map to work.')
        return
      }
      
      mapboxgl.accessToken = MAPBOX_TOKEN
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: CUSTOM_STYLE,
        center: [-110.9265, 32.2217], // Tucson coordinates
        zoom: 11, // Adjusted zoom level for Tucson
        antialias: true,
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
        attributionControl: true,
        trackUserLocation: true,
        renderWorldCopies: true,
        maxZoom: 18,
        minZoom: 0,
        pitch: 0,
        bearing: 0,
        interactive: true,
        fadeDuration: 300,
        collectResourceTiming: false
      })

      // Add navigation control
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Add error handling for map load
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e)
        setError('Error loading map: ' + e.message)
      })

      // Add style loading handlers
      map.current.on('style.load', () => {
        setStyleLoaded(true)
      })

      map.current.on('style.error', (e) => {
        console.error('Style loading error:', e)
        setError('Error loading map style: ' + e.message)
      })

      // Add load event handler
      map.current.on('load', () => {
        console.log(`[MapView][${mountId.current}] Map loaded, setting up filters and hover events. selectedAreaId:`, selectedAreaId, 'map.current:', !!map.current)
        
        // Set up hover effect
        const style = map.current.getStyle()
        const climbingLayerIndex = style.layers.findIndex(l => l.id === 'climbing-areas')
        if (climbingLayerIndex !== -1) {
          console.log(`[MapView][${mountId.current}] Setting up hover effect for climbing-areas layer. selectedAreaId:`, selectedAreaId)
          map.current.setPaintProperty(
            'climbing-areas',
            'fill-color',
            [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#c43302',
              style.layers[climbingLayerIndex].paint?.['fill-color'] || '#088',
            ]
          )
        } else {
          console.error('climbing-areas layer not found in style')
        }

        // Log features in climbing-areas layer
        const features = map.current.queryRenderedFeatures({ layers: ['climbing-areas'] })

        // Filter and log all climbing areas with level 0
        const level0Areas = features.filter(f => f.properties && f.properties.level === 0)
        // Deduplicate areas by ID
        const uniqueAreas = Array.from(new Map(level0Areas.map(f => [f.properties.id, {
          id: f.properties.id,
          name: f.properties.name
        }])).values())
        // Sort by name alphabetically
        uniqueAreas.sort((a, b) => a.name.localeCompare(b.name))
        console.log(`[MapView][${mountId.current}] Setting visible areas from map load event:`, uniqueAreas, 'selectedAreaId:', selectedAreaId)
        setVisibleAreas(uniqueAreas)
      })

      // Add moveend event to update visible areas after map movement
      map.current.on('moveend', () => {
        const handleIdle = () => {
          updateVisibleAreas()
          map.current.off('idle', handleIdle)
        }
        map.current.on('idle', handleIdle)
      })

      // Map seamless hover events
      let lastFeatureId = null
      map.current.on('mousemove', 'climbing-areas', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const featureId = feature.properties.id
          if (featureId !== lastFeatureId) {
            setHoveredId(featureId)
            lastFeatureId = featureId
          }
          map.current.getCanvas().style.cursor = 'pointer'
        } else {
          // No features under cursor, clear hover
          if (lastFeatureId !== null) {
            setHoveredId(null)
            lastFeatureId = null
          }
          map.current.getCanvas().style.cursor = ''
        }
      })
      map.current.on('mouseleave', 'climbing-areas', (e) => {
        setHoveredId(null)
        lastFeatureId = null
        map.current.getCanvas().style.cursor = ''
      })

      // Add click handler for areas
      map.current.on('click', 'climbing-areas', async (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0]
          const featureId = feature.properties.id

          // Try to zoom to bbox from areaInfo, otherwise fetch from API
          let bbox = areaInfo[featureId]?.bbox
          if (!bbox) {
            try {
              const res = await fetch(`/api/areas/info?ids=${featureId}`)
              if (res.ok) {
                const data = await res.json()
                if (data[0] && data[0].bbox) {
                  bbox = data[0].bbox
                }
              }
            } catch (err) {
              console.error('Error fetching bbox for area:', featureId, err)
            }
          }
          if (bbox && map.current) {
            const [minLng, minLat, maxLng, maxLat] = bbox
            map.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 800 })
          }

          // Use area state service to update state
          console.log('[MapView] calling updateAreaState from map-click with', featureId)
          updateAreaState(featureId, 'map-click')
        }
      })

      // Handle WebGL context loss
      map.current.on('webglcontextlost', () => {
        console.error('WebGL context lost')
        setError('Map rendering was interrupted. Please refresh the page.')
      })

      // Handle WebGL context restoration
      map.current.on('webglcontextrestored', () => {
        console.log('WebGL context restored')
        setError(null)
      })

    } catch (err) {
      console.error('Error initializing map:', err)
      setError('Error initializing map: ' + err.message)
    }

    // Cleanup on unmount
    return () => {
      if (map.current) {
        try {
          map.current.remove()
        } catch (err) {
          console.error('Error during map cleanup:', err)
        }
        map.current = null
      }
      isMounted.current = false
    }
  }, [])

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        color: 'red',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <h3>Map Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              marginTop: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative'
    }}>
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: '#f0f0f0'
        }} 
      />
      {!styleLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1
        }}>
          Loading map style...
        </div>
      )}
    </div>
  )
} 