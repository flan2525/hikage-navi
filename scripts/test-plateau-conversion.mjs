import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { convertCityGml, sourceCrs } from './lib/plateau-conversion.mjs'

const xml = await readFile('scripts/fixtures/plateau-building.gml', 'utf8')
const result = convertCityGml(xml, { meshCode: 'fixture', dataYear: 2024, target: { bbox: [132.459, 34.394, 132.464, 34.397] } })
assert.equal(result.features.length, 2)
assert.equal(result.features[0].properties.heightSource, 'measuredHeight')
assert.equal(result.features[1].properties.heightSource, 'geometry_z_range')
assert.equal(result.features[1].properties.height, 13)
assert.equal(result.features[0].geometry.coordinates[0][0][0], 132.46)
assert.equal(result.features[0].geometry.coordinates[0][0][1], 34.395)
assert.equal(result.stats.invalidFootprint, 1)
assert.equal(sourceCrs('<gml:Envelope srsName="EPSG:6697"/>'), 'EPSG:6697')
console.log('PLATEAU conversion tests passed')
