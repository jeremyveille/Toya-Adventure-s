import sys
from PIL import Image

def remove_background(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()

        # Prendre la couleur du pixel en haut à gauche comme couleur de fond
        bg_color = datas[0]
        
        # Tolérance pour la couleur de fond
        tolerance = 45
        
        newData = []
        for item in datas:
            # Vérifier si la couleur du pixel est proche de la couleur de fond
            # item est (R, G, B, A)
            if abs(item[0] - bg_color[0]) < tolerance and \
               abs(item[1] - bg_color[1]) < tolerance and \
               abs(item[2] - bg_color[2]) < tolerance:
                # Rendre le pixel transparent
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(image_path, "PNG")
        print(f"Fond retire pour {image_path} (Couleur fond estimée: {bg_color})")
    except Exception as e:
        print(f"Erreur avec {image_path}: {e}")

if __name__ == "__main__":
    remove_background("assets/enemy.png")
    remove_background("assets/hero_spritesheet.png")
    remove_background("assets/hero.png")
    remove_background("assets/player.png")
