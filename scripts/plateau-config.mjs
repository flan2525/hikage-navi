export const plateauConfig = {
  cityCode: '34100',
  cityName: '広島市',
  dataYear: 2024,
  specification: '4.1',
  cityGmlVersion: '2.0',
  sourceCrs: 'EPSG:6697 (JGD2011 geographic 2D + height)',
  outputCrs: 'EPSG:4326 (WGS84 longitude, latitude)',
  license: 'PLATEAU Data License 1.0 / source attribution required',
  target: {
    name: '広島駅〜平和記念公園 経路周辺（約350m）',
    // [min longitude, min latitude, max longitude, max latitude]
    bbox: [132.45, 34.392, 132.4795, 34.4015],
    bufferMeters: 350,
  },
  sourceFiles: [
    { meshCode: '51324376', maxLod: 2, path: 'data/raw/51324376_bldg_6697_op.gml', url: 'https://assets.cms.plateau.reearth.io/assets/cc/d28a0b-63c2-4da8-a8e2-2dc20fc263dc/34100_hiroshima-shi_city_2024_citygml_1_op/udx/bldg/51324376_bldg_6697_op.gml' },
    { meshCode: '51324377', maxLod: 2, path: 'data/raw/51324377_bldg_6697_op.gml', url: 'https://assets.cms.plateau.reearth.io/assets/cc/d28a0b-63c2-4da8-a8e2-2dc20fc263dc/34100_hiroshima-shi_city_2024_citygml_1_op/udx/bldg/51324377_bldg_6697_op.gml' },
    { meshCode: '51324378', maxLod: 3, path: 'data/raw/51324378_bldg_6697_op.gml', url: 'https://assets.cms.plateau.reearth.io/assets/cc/d28a0b-63c2-4da8-a8e2-2dc20fc263dc/34100_hiroshima-shi_city_2024_citygml_1_op/udx/bldg/51324378_bldg_6697_op.gml' },
    { meshCode: '51324386', maxLod: 1, path: 'data/raw/51324386_bldg_6697_op.gml', url: 'https://assets.cms.plateau.reearth.io/assets/cc/d28a0b-63c2-4da8-a8e2-2dc20fc263dc/34100_hiroshima-shi_city_2024_citygml_1_op/udx/bldg/51324386_bldg_6697_op.gml' },
    { meshCode: '51324387', maxLod: 1, path: 'data/raw/51324387_bldg_6697_op.gml', url: 'https://assets.cms.plateau.reearth.io/assets/cc/d28a0b-63c2-4da8-a8e2-2dc20fc263dc/34100_hiroshima-shi_city_2024_citygml_1_op/udx/bldg/51324387_bldg_6697_op.gml' },
    { meshCode: '51324388', maxLod: 3, path: 'data/raw/51324388_bldg_6697_op.gml', url: 'https://assets.cms.plateau.reearth.io/assets/cc/d28a0b-63c2-4da8-a8e2-2dc20fc263dc/34100_hiroshima-shi_city_2024_citygml_1_op/udx/bldg/51324388_bldg_6697_op.gml' },
  ],
  output: {
    geojson: 'public/data/plateau/hiroshima-central-buildings.geojson',
    metadata: 'public/data/plateau/hiroshima-central-buildings.meta.json',
  },
}
