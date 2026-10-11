# 3D assets

Drop `.glb` / `.gltf` / `.hdr` files here. They are served at `/3d/<filename>`.

Register each file in `front_end/src/lib/webgl/assets/assetManifest.ts` (id, path, units, up-axis) and add a baked JSON doc under `front_end/src/lib/webgl/assets/annotations/`. The model viewer lists every registered asset. Prime marks (front / back / midpoint / faces / viewpoints / highlights / regions / colors) live in that JSON; the indexer memoir for a named model records how it should look.

Draco-compressed glTF uses the self-hosted decoder under `/3d/decoders/gltf/` — do not point `DRACOLoader` at a CDN.

Binaries in this folder are committed with the repo.
