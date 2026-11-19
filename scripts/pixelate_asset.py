"""Nettoie une image générée : détoure le fond uni, redimensionne en pixel-art et quantifie.

Utilisation :
    python scripts/pixelate_asset.py <entree.png> <sortie.png> [--size 96] [--colors 28] [--tolerance 46]

Le fond est détecté à partir des quatre coins, puis retiré par diffusion depuis les bords :
les pixels proches de la couleur de fond et connectés au bord deviennent transparents.
L'image est ensuite recadrée, rééchantillonnée au plus proche voisin et quantifiée pour
retrouver une palette limitée, typique du pixel-art.
"""

import argparse
from collections import deque

from PIL import Image


def corner_color(image):
    width, height = image.size
    corners = [
        image.getpixel((0, 0)),
        image.getpixel((width - 1, 0)),
        image.getpixel((0, height - 1)),
        image.getpixel((width - 1, height - 1)),
    ]
    channels = list(zip(*corners))
    return tuple(sorted(channel)[len(channel) // 2] for channel in channels)


def remove_background(image, tolerance):
    """Rend transparents les pixels de bord proches de la couleur du fond."""
    rgb = image.convert('RGB')
    width, height = rgb.size
    pixels = rgb.load()
    background = corner_color(rgb)
    alpha = Image.new('L', (width, height), 255)
    mask = alpha.load()
    seen = bytearray(width * height)
    queue = deque()

    def close_to_background(x, y):
        red, green, blue = pixels[x, y]
        return (
            abs(red - background[0]) <= tolerance
            and abs(green - background[1]) <= tolerance
            and abs(blue - background[2]) <= tolerance
        )

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1
        if not close_to_background(x, y):
            continue
        mask[x, y] = 0
        if x > 0:
            queue.append((x - 1, y))
        if x < width - 1:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y < height - 1:
            queue.append((x, y + 1))

    result = rgb.convert('RGBA')
    result.putalpha(alpha)
    return result


def pixelate(image, size, colors):
    """Recadre, réduit au plus proche voisin puis quantifie en conservant l'alpha."""
    box = image.getbbox()
    if box:
        image = image.crop(box)
    scale = min(size / image.width, size / image.height)
    target = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(target, Image.NEAREST)

    rgb = image.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT).convert('RGB')
    result = rgb.convert('RGBA')
    result.putalpha(image.getchannel('A'))

    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(result, ((size - result.width) // 2, (size - result.height) // 2))
    return canvas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('destination')
    parser.add_argument('--size', type=int, default=96)
    parser.add_argument('--colors', type=int, default=28)
    parser.add_argument('--tolerance', type=int, default=46)
    args = parser.parse_args()

    image = Image.open(args.source).convert('RGBA')
    image = remove_background(image, args.tolerance)
    image = pixelate(image, args.size, args.colors)
    image.save(args.destination, optimize=True)
    print(f'{args.destination} · {image.width}x{image.height} · {args.colors} couleurs')


if __name__ == '__main__':
    main()
