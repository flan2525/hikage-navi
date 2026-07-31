import { describe, expect, it } from 'vitest'
import { navigationPoints, pointById } from './navigationPoints'
import { datasetIdsForJourney } from '../services/buildings'

describe('multi-area navigation points', () => {
  it('keeps similarly named railway and tram stops distinct', () => {
    expect(pointById.get('astram-hakushima')?.coordinates).not.toEqual(pointById.get('shinhakushima')?.coordinates)
    expect(pointById.get('jr-yokogawa')?.coordinates).not.toEqual(pointById.get('hiroden-yokogawa')?.coordinates)
    expect(pointById.get('jr-nishi-hiroshima')?.coordinates).not.toEqual(pointById.get('hiroden-nishi-hiroshima')?.coordinates)
  })
  it('provides a source for every selectable point', () => expect(navigationPoints.every((point) => point.source.length > 0)).toBe(true))
  it('selects the minimum west-area seed datasets without central data', () => expect(datasetIdsForJourney('yokogawa', 'nishi-hiroshima')).toEqual(['yokogawa', 'nishi-hiroshima']))
})
