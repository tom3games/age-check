# 緑/マゼンタ背景を抜いて webp(透過) にする。python key.py
import numpy as np, glob, os
from PIL import Image, ImageFilter
D=os.path.dirname(os.path.abspath(__file__)); OUT=D+'/../img/'
def key(src, mag=False, size=(896,1344)):
    a=np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    r,g,b=a[...,0],a[...,1],a[...,2]
    k=(np.minimum(r,b)-g) if mag else (g-np.maximum(r,b))
    al=1-np.clip((k-18)/(70-18),0,1)
    # 縁の色かぶりを取る
    if mag:
        m=np.maximum(g, np.minimum(np.minimum(r,b), g+ (1-al)*0+20))
        r=np.where(k>0, np.minimum(r, g+ (r-g)*al), r); b=np.where(k>0, np.minimum(b, g+(b-g)*al), b)
    else:
        lim=np.maximum(r,b); g=np.where(g>lim, lim+(g-lim)*al*0.0, g)
    out=np.dstack([r,g,b,al*255]).clip(0,255).astype(np.uint8)
    im=Image.fromarray(out,'RGBA')
    A=im.split()[3].filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8)); im.putalpha(A)
    return im.resize(size, Image.LANCZOS)
for f in sorted(glob.glob(D+'/raw/[cyn]_*.png')):
    n=os.path.basename(f)[:-4]; im=key(f, mag=n in('y_kappa','y_kappakid'))
    im.save(OUT+n+'.webp', quality=84, method=6); print(n, os.path.getsize(OUT+n+'.webp')//1024,'KB')
it=key(D+'/raw/items.png', size=(1536,1024))
names=['beer','strong','cup','tabako','sake','highball']
for i,n in enumerate(names):
    c=it.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)); bb=c.getbbox(); c=c.crop(bb); c.thumbnail((300,300)); c.save(OUT+'i_'+n+'.webp',quality=86); print(n,c.size)
bg=Image.open(D+'/raw/bg.png').convert('RGB'); bg.save(OUT+'bg.webp',quality=82); print('bg',os.path.getsize(OUT+'bg.webp')//1024)
