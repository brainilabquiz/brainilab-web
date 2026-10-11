"""Export platform sizes from the existing brand mark. No new artwork."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'assets/brand/iso-multicolor.png').convert('RGBA')
folder = root / 'assets/brand/app'
folder.mkdir(exist_ok=True)
for name, size, ratio in [('icon-192.png',192,.82),('icon-512.png',512,.82),('icon-maskable-512.png',512,.55),('apple-touch-icon.png',180,.82)]:
    image = Image.new('RGB',(size,size),'white')
    scale = size*ratio/max(source.size)
    mark = source.resize((round(source.width*scale),round(source.height*scale)),Image.Resampling.LANCZOS)
    image.paste(mark,((size-mark.width)//2,(size-mark.height)//2),mark)
    image.save(folder/name,optimize=True)
