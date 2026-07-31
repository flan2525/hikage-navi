import { describe, expect, it } from 'vitest'
import { MapErrorBoundary } from './MapErrorBoundary'

describe('MapErrorBoundary', () => {
  it('switches only the map subtree to its fallback state after a rendering error', () => {
    expect(MapErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true })
  })
})
