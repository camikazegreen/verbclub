import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useFilters } from '../context/FiltersContext'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const CUSTOM_STYLE = 'mapbox://styles/camikazegreen/cmb9irlzw012n01rfbsrn17rb'

// Debug logging
console.log('Mapbox GL JS version:', mapboxgl.version)
console.log('All env variables:', import.meta.env)
console.log('Token length:', MAPBOX_TOKEN?.length)

export default function MapView() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [error, setError] = useState(null)
  const [styleLoaded, setStyleLoaded] = useState(false)
  const isMounted = useRef(false)
  const { setVisibleAreas, hoveredId, setHoveredId } = useFilters()
  const lastHoveredId = useRef(null)

  // Helper to set hover state on a feature
  const setMapFeatureHover = (featureId, hover) => {
    if (!map.current) return
    try {
      map.current.setFeatureState(
        { source: 'composite', sourceLayer: 'climbing_areas', id: featureId },
        { hover }
      )
    } catch (e) {
      // Ignore errors for features not in view
    }
  }

  // Sync hoveredId from context to map feature state
  useEffect(() => {
    if (!map.current) return
    if (lastHoveredId.current && lastHoveredId.current !== hoveredId) {
      setMapFeatureHover(lastHoveredId.current, false)
    }
    if (hoveredId) {
      setMapFeatureHover(hoveredId, true)
    }
    lastHoveredId.current = hoveredId
    // Cleanup on unmount
    return () => {
      if (hoveredId) setMapFeatureHover(hoveredId, false)
    }
  }, [hoveredId])

  useEffect(() => {
    console.log('MapView useEffect running, map.current:', map.current ? 'exists' : 'null')
    
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

      // Verify style URL
      console.log('Initializing map with style:', CUSTOM_STYLE)
      
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
        console.log('Style loaded successfully')
        const style = map.current.getStyle()
        console.log('Current style:', {
          name: style.name,
          version: style.version,
          metadata: style.metadata,
          sources: Object.keys(style.sources || {}),
          layers: style.layers?.map(layer => ({
            id: layer.id,
            type: layer.type,
            source: layer.source
          }))
        })
        setStyleLoaded(true)

        // Update climbing-areas layer for hover effect
        const climbingLayerIndex = style.layers.findIndex(l => l.id === 'climbing-areas')
        if (climbingLayerIndex !== -1) {
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
        }
      })

      map.current.on('style.error', (e) => {
        console.error('Style loading error:', e)
        setError('Error loading map style: ' + e.message)
      })

      // Add load event handler
      map.current.on('load', () => {
        console.log('Map loaded successfully')
        // Log available sources and layers
        const style = map.current.getStyle()
        console.log('Available sources:', Object.keys(style.sources || {}))
        console.log('Available layers:', style.layers?.map(l => l.id))

        // Set filter to only show level 0 features
        map.current.setFilter('climbing-areas', ['==', ['get', 'level'], 0])

        // Log climbing-areas layer definition
        const climbingLayer = style.layers?.find(l => l.id === 'climbing-areas')
        console.log('climbing-areas layer definition:', climbingLayer)
        if (climbingLayer) {
          console.log('climbing-areas source:', climbingLayer.source)
          console.log('climbing-areas source-layer:', climbingLayer['source-layer'])
        }

        // Log features in climbing-areas layer
        const features = map.current.queryRenderedFeatures({ layers: ['climbing-areas'] })
        console.log('Features in climbing-areas:', features)

        // Filter and log all climbing areas with level 0
        const level0Areas = features.filter(f => f.properties && f.properties.level === 0)
        const level0List = level0Areas.map(f => ({
          id: f.properties.id,
          name: f.properties.name
        }))
        console.log('Level 0 climbing areas:', level0List)
        setVisibleAreas(level0List)
      })

      // Map hover events
      map.current.on('mouseenter', 'climbing-areas', (e) => {
        map.current.getCanvas().style.cursor = 'pointer'
        if (e.features && e.features.length > 0) {
          setHoveredId(e.features[0].id)
        }
      })
      map.current.on('mouseleave', 'climbing-areas', (e) => {
        map.current.getCanvas().style.cursor = ''
        setHoveredId(null)
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
      console.log('MapView cleanup running')
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