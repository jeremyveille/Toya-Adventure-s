# Terrain Tilesets (64×64 Top-Down — Dual-Grid 15-Piece)

Ce dossier regroupe les tilesets pixel-art 64×64 pour la grille orthogonale de `TerrainRenderer` :

- `meadow_dirt_64.png` (256×64, 4 frames de 64×64) :
  - Frame 0 : Herbe de prairie paisible (extraite de `assets/collection.png` ASSET 01)
  - Frame 1 : Herbe sauvage (sud du pont, extraite de `assets/collection.png` ASSET 02)
  - Frame 2 : Chemin de terre battue (fallback sans dual-grid)
  - Frame 3 : Tablier de pont en chêne
- `grass_dirt_dualgrid_64.png` (1024×64, 16 frames de 64×64) :
  - Atlas **Dual-Grid 15-piece** (masque 4 bits `TL=1, TR=2, BL=4, BR=8`, frame 0 vide, frames 1..15 transitions herbe ↔ terre).
- `water_bank_dualgrid_64.png` (1024×64, 16 frames de 64×64) :
  - Atlas **Dual-Grid 15-piece** (masque 4 bits `TL=1, TR=2, BL=4, BR=8`, rives 2.5D et eau de rivière).

Régénération via : `node scripts/build_tilesets_and_sprites.js`.
Format 100 % compatible avec un remplacement direct par des exports 15-piece Dual-Grid de **SpriteCook MCP**.
