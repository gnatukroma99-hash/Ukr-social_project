"""Regenerate launcher artwork with Python and Pillow. No network dependencies."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
lime, ink, dark = '#D3FA73', '#172111', '#13121A'
points = [(-.15,-.94),(.15,-.94),(.15,-.36),(.57,-.78),(.78,-.57),(.36,-.15),(.94,-.15),(.94,.15),(.36,.15),(.78,.57),(.57,.78),(.15,.36),(.15,.94),(-.15,.94),(-.15,.36),(-.57,.78),(-.78,.57),(-.36,.15),(-.94,.15),(-.94,-.15),(-.36,-.15),(-.78,-.57),(-.57,-.78),(-.15,-.36)]

def mark(size, fg=False, solid=False):
    s=1024; img=Image.new('RGBA',(s,s), lime if solid else (0,0,0,0)); pen=ImageDraw.Draw(img)
    if not (fg or solid): pen.rounded_rectangle((26,26,998,998), radius=232, fill=lime)
    radius=277 if fg else 351
    pen.polygon([(512+x*radius,512+y*radius) for x,y in points],fill=ink)
    return img.resize((size,size), Image.Resampling.LANCZOS)

mark(512).save(root/'desktop/icon.png')
mark(256).save(root/'desktop/icon.ico',sizes=[(x,x) for x in (16,24,32,48,64,128,256)])
res=root/'android/app/src/main/res'
for density, scale in [('mdpi',1),('hdpi',1.5),('xhdpi',2),('xxhdpi',3),('xxxhdpi',4)]:
    folder=res/('mipmap-'+density)
    mark(int(48*scale)).save(folder/'ic_launcher.png')
    mark(int(48*scale)).save(folder/'ic_launcher_round.png')
    mark(int(108*scale),fg=True).save(folder/'ic_launcher_foreground.png')

def splash(path):
    with Image.open(path) as before: w,h=before.size
    canvas=Image.new('RGB',(w,h),dark); size=max(32,min(w,h)//6); logo=mark(size)
    canvas.paste(logo,((w-size)//2,(h-size)//2),logo); canvas.save(path,optimize=True)

for file in res.glob('drawable*/splash.png'): splash(file)
ios=root/'ios/App/App/Assets.xcassets'
mark(1024,solid=True).convert('RGB').save(ios/'AppIcon.appiconset/AppIcon-512@2x.png')
for file in (ios/'Splash.imageset').glob('*.png'): splash(file)
