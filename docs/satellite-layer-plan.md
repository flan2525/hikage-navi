# 衛星レイヤー導入前の設計

今回、Landsat、Sentinel-2、地表面温度、NDVIの取得・表示・ダミー値は実装しない。

将来のメタデータは `EnvironmentalLayerMetadata` として `src/types.ts` に定義する。静的ラスタまたはタイルのメタデータを `public/data/environment/` に置き、MapLibreのベース地図と建物・影レイヤーの間へ専用ソースとして追加する。観測日時、出典、解像度、範囲を必須にし、建物影の推定値と衛星観測値を混同しない。
