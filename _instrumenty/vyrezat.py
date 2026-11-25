# Вырезает товар со светлого однотонного фона скриншота (пост Instagram, белый фон) в PNG с прозрачностью.
# Запуск: python3 _instrumenty/vyrezat.py <скриншот> <x1,y1,x2,y2> <выход.png> [края] [допуск]
#   x1,y1,x2,y2 — рамка в точках экрана iPhone (как на скриншоте шириной 923), скрипт сам умножает на 1179/923
#   края — с каких краёв начинается фон: t верх, l лево, r право, b низ (по умолчанию tlr: снизу рука или предмет уходит за край)
#   допуск — насколько цвет может отличаться от фона (по умолчанию 10; больше — режет смелее)
# Нужен scipy: pip install scipy. Результат проверить глазами на тёмном и цветном фоне.
# Образец: goodstore-crimea/img/iphone18-cut.png (вызов: ... b2ce2343.png 0,742,923,1508 img/iphone18-cut.png tlr 9)
import sys,numpy as np
from PIL import Image,ImageFilter
from scipy import ndimage as nd
src,box,out=sys.argv[1],[int(v) for v in sys.argv[2].split(',')],sys.argv[3]
edges=sys.argv[4] if len(sys.argv)>4 else 'tlr'
tol=float(sys.argv[5]) if len(sys.argv)>5 else 10
k=1179/923
im=Image.open(src).convert('RGB').crop(tuple(round(v*k) for v in box))
a=np.asarray(im).astype(float)
bg=np.median(np.concatenate([a[:4].reshape(-1,3),a[:, :4].reshape(-1,3),a[:, -4:].reshape(-1,3)]),axis=0)
d=np.sqrt(((a-bg)**2).sum(-1))
light=d<tol
lab,n=nd.label(light)
seed=set()
if 't' in edges: seed|=set(np.unique(lab[0]))
if 'l' in edges: seed|=set(np.unique(lab[:,0]))
if 'r' in edges: seed|=set(np.unique(lab[:,-1]))
if 'b' in edges: seed|=set(np.unique(lab[-1]))
seed.discard(0)
bgmask=np.isin(lab,list(seed))
# заполнить мелкие дырки внутри предмета, убрать островки фона
fg=~bgmask
fg=nd.binary_fill_holes(fg)
fg=nd.binary_opening(fg,iterations=1)
# оставить крупнейшие компоненты
lab2,n2=nd.label(fg); sizes=nd.sum(fg,lab2,range(1,n2+1))
keep=[i+1 for i,s in enumerate(sizes) if s>0.002*fg.size]
fg=np.isin(lab2,keep)
# мягкий край: альфа по расстоянию от фона в полосе 2px
alpha=Image.fromarray((fg*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
al=np.asarray(alpha).astype(float)
# у края делаем пиксели чуть прозрачнее, если они близки к цвету фона (убирает белый ореол)
edge=(al>0)&(al<255)
soft=np.clip(d/ (tol*2.2),0,1)
al=np.where(edge,al*np.maximum(soft,0.35),al)
rgba=np.dstack([a,al]).clip(0,255).astype(np.uint8)
res=Image.fromarray(rgba,'RGBA')
bb=res.getbbox(); res=res.crop(bb)
res=res.filter(ImageFilter.UnsharpMask(radius=1.2,percent=60,threshold=2))
res.save(out,optimize=True); print(out,res.size,'bg',bg.round())
