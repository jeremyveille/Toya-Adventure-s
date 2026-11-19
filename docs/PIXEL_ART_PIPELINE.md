# Chaîne pixel-art avec ComfyUI

Le jeu n'utilise aucun asset généré pour le terrain ou les personnages animés : les textures 2.5D sont dessinées par `WorldScene.generateTextures`. La génération sert aux illustrations fixes, comme le portrait de dialogue.

## Prérequis

- ComfyUI local répondant sur `http://127.0.0.1:8188`.
- Un checkpoint image dans `ComfyUI-Shared/models/checkpoints` (testé avec `DreamShaper_8_pruned.safetensors`, SD 1.5, ~2 Go). Wan 2.2 est un modèle vidéo : il ne produit pas de sprites détourés.
- Serveur MCP `comfyui` configuré dans `~/.config/opencode/opencode.json` :

```json
{
  "mcp": {
    "servers": {
      "comfyui": {
        "type": "local",
        "command": ["node", "C:\\Users\\jerem\\.local\\share\\opencode\\mcp\\comfyui\\node_modules\\comfyui-mcp-server-node\\dist\\server.js"],
        "environment": {
          "COMFYUI_URL": "http://127.0.0.1:8188",
          "COMFY_MCP_WORKFLOW_DIR": "C:\\Users\\jerem\\.local\\share\\opencode\\mcp\\comfyui\\workflows"
        }
      }
    }
  }
}
```

Le serveur scanne `COMFY_MCP_WORKFLOW_DIR` au démarrage : après avoir copié un workflow, redémarrer OpenCode pour que l'outil apparaisse.

## Workflow

`docs/comfyui/generate_pixel_art.json` est le workflow au format API. Le copier dans le dossier des workflows MCP ; il devient l'outil `generate_pixel_art` avec les paramètres `prompt`, `negative_prompt`, `width`, `height`, `steps`, `cfg`, `seed` et `checkpoint_model`.

Échantillonnage : `dpmpp_2m` / `karras`, 24 pas, CFG 7. Générer en 512 × 512 puis réduire donne de meilleurs résultats qu'une génération directe en 64 × 64.

## Détourage et réduction

`scripts/pixelate_asset.py` (Pillow) détoure un fond uni depuis les bords, recadre, réduit au plus proche voisin et quantifie la palette :

```sh
python scripts/pixelate_asset.py brut.png assets/ui/toya-portrait.png --size 96 --colors 30 --tolerance 60
```

- `--size` : côté final en pixels (96 pour le portrait de dialogue).
- `--colors` : taille de palette ; 24–32 suffit pour rester lisible.
- `--tolerance` : écart maximal au fond détecté aux quatre coins ; augmenter si le fond est dégradé.

## Prompt de référence

```
16-bit pixel art bust portrait of a young adventurer named Toya, spiky black hair,
teal tunic with brass buttons, small brass compass pendant, confident smile,
SNES JRPG dialogue portrait, thick chunky pixels, limited palette,
crisp single-pixel dark outline, flat solid magenta background,
centered head and shoulders, no text
```

Négatif :

```
blurry, smooth gradients, photorealistic, 3d render, painting, text, watermark,
signature, frame, border, scenery, multiple characters, deformed face
```

Le résultat est vérifié à l'œil avant intégration : le détourage laisse parfois une frange, que `--tolerance` corrige.

## Dépannage

- `400 ... value_smaller_than_min` sur `seed` : le workflow générique `generate_image` livré avec le serveur MCP contient `"seed": -1`, refusé par ComfyUI (minimum 0). Remplacer par un entier valide, ou par `PARAM_INT_SEED` en fournissant explicitement une graine (`-1` est alors tiré au hasard par le MCP).
- `400 ... required_input_missing` : le MCP laisse les paramètres optionnels non fournis à `undefined`, et la clé disparaît du JSON envoyé. Toujours passer `width`, `height` et `steps` (et `seed` si le workflow le déclare).
- `list_checkpoint_models` peut renvoyer une liste vide alors que ComfyUI connaît le modèle : vérifier directement `GET http://127.0.0.1:8188/object_info/CheckpointLoaderSimple`.

## Intégration

- Le portrait est chargé dans `WorldScene.preload` sous la clé `toya_portrait` et affiché par `HUDScene` (repli sur `tex_npc` si la texture manque).
- Les tests Node et le parcours E2E ne lisent pas le contenu de l'image : remplacer le PNG ne casse rien, à condition de garder le chemin.
