"""Create editable PhotoCraft shape layers and export transparent PNGs. Python: fonttools."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from xml.etree import ElementTree as ET
import base64, json, os, subprocess, sys
from fontTools.pens.basePen import BasePen
from fontTools.svgLib.path import parse_path

here = Path(__file__).resolve().parent
root = here.parents[1]
cli = Path(sys.argv[1]) if len(sys.argv)>1 else Path(os.environ.get('PHOTOCRAFT_CLI','photocraft-cli'))
docs = here/'editable'; images = root/'app/assets/ink'
docs.mkdir(exist_ok=True); images.mkdir(parents=True,exist_ok=True)
def compact(v): return json.dumps(v,ensure_ascii=True,separators=(',',':'))

class Knots(BasePen):
    def __init__(self,scale): super().__init__(None); self.scale=scale; self.subs=[]; self.points=[]
    def xy(self,p): return [round(v*self.scale,3) for v in p]
    def _moveTo(self,p): self.points=[{'anchor':self.xy(p)}]
    def _lineTo(self,p): self.points.append({'anchor':self.xy(p)})
    def _curveToOne(self,a,b,c):
        self.points[-1]['out']=self.xy(a); self.points.append({'anchor':self.xy(c),'in':self.xy(b)})
    def finish(self,closed):
        if not self.points:return
        if closed and len(self.points)>1 and self.points[-1]['anchor']==self.points[0]['anchor']:
            last=self.points.pop()
            if 'in' in last:self.points[0]['in']=last['in']
        if len(self.points)>1:self.subs.append({'closed':closed,'knots':self.points})
        self.points=[]
    def _closePath(self):self.finish(True)
    def _endPath(self):self.finish(False)

W='#f3e9d7'; L='#c4a3f4'; G='#cce98a'; D='#25232c'; PINK='#ed9ab9'; BLUE='#9dbfe5'; A='#efb282'; SEA='#81cebb'
def path(d,fill=None,stroke=None,weight=3,scale=1):
    pen=Knots(scale);parse_path(d,pen);pen.finish(False)
    return {'kind':'path','path':{'subpaths':pen.subs},'fill':fill,**({'stroke':{'width':weight*scale,'color':stroke,'cap':'round','join':'round','align':'center'}} if stroke else {})}
def ink(d,c=W,w=3):return path(d,stroke=c,weight=w)
def rect(x,y,w,h,c,r=0):return {'kind':'roundedRect' if r else 'rect','rect':[x,y,w,h],'radii':r,'fill':c}
def oval(x,y,w,h,c):return {'kind':'ellipse','rect':[x,y,w,h],'fill':c}
def dot(x,y,r,c):return oval(x-r,y-r,r*2,r*2,c)

# Each entry is an individual, editable illustration, drawn on a 96 × 96 grid.
art={
 'film':[rect(10,38,76,43,A,5),path('M9 30 80 15 84 30 13 46Z',W),path('M22 27 31 25 40 36 32 38ZM46 22 55 20 64 31 56 33Z',D),path('M40 48 59 58 40 70Z',D),ink('M17 76h60',D,2)],
 'shorts':[rect(26,7,44,81,SEA,8),rect(30,14,36,62,D,4),rect(40,9,16,2,D,1),path('M35 52 41 52 44 35 49 58 54 32 57 48 62 48',None,W,3),rect(42,80,12,3,D,1)],
 'tape':[rect(5,19,86,58,L,6),rect(10,24,76,36,W,4),rect(19,34,58,17,D,7),dot(29,42,6,L),dot(67,42,6,L),dot(29,42,2,D),dot(67,42,2,D),path('M17 77 24 64 73 64 79 77Z',D),ink('M40 39h17m-17 5h17',W,2),dot(14,69,2,D),dot(83,69,2,D)],
 'photo':[path('M12 29h16l6-11h23l7 11h19q4 0 4 5v39q0 4-5 4H14q-5 0-5-5V33q0-4 3-4Z',PINK),rect(12,34,72,11,W,2),dot(48,53,20,D),dot(48,53,15,W),dot(48,53,11,D),dot(44,49,4,PINK),rect(67,25,12,4,W,1)],
 'nib':[ink('M10 76q12-19 22-8t20-4',A,4),path('m27 63 7-25 25-22 17 16-22 26z',W),path('m53 21 8-9 20 19-8 9z',A),ink('m29 61 17-16',D,3),dot(48,43,4,D),ink('m61 63 19-3m-21 10 12 1',A,2)],
 'pad':[path('M29 29q19 4 38 0 13-1 17 14l7 21q2 15-10 13l-15-13H30L17 76q-13 6-11-9l7-24q4-16 16-14Z',BLUE),path('M44 31q-7-15 5-17l11-1',None,W,3),rect(18,45,22,7,D,1),rect(26,37,7,22,D,1),dot(68,48,4,W),dot(77,42,4,D),ink('M44 59h8',D,2)],
 'horizon':[dot(60,31,14,G),path('M6 64 31 37 47 51 59 40 88 63Z',L),ink('M7 68h81m-62 8h43',W,3)],
 'notches':[path('M13 32 75 19 83 62 20 77Z',A),ink('m26 39 4 19m6-22 4 19m7-21 4 17m6-20 4 19m-37 4 41-20',D,3)],
 'tiles':[path('m13 38 21-20 22 22-21 20Z',W),path('m42 55 21-20 22 21-21 21Z',L),ink('m19 64 9 8m40-48 9 8',L,2)],
 'drop':[path('M47 11C41 26 25 41 25 51a23 23 0 0 0 46 0c0-11-18-31-24-40Z',BLUE),ink('M35 48q-2 10 8 15',W,4),ink('M16 75q30 10 64-1',BLUE,2)],
 'wave':[path('M7 65q16 3 26-24 13-28 47-21-22 10-18 27 3 17 24 15-21 23-79 3Z',SEA),ink('M18 66q20-1 29-23',W,3),ink('M11 78q20 5 35 0t33-1',BLUE,2)],
 'cat':[path('M20 47 15 20 40 32q9-3 18 0l22-14-2 30q4 25-28 30-37 1-30-31Z',W),ink('m28 47 8-1m21-2 8-2',D,3),path('m41 53 10-1-5 6Z',D),ink('m18 56-10-1m12 7-11 3m60-12 15-4m-13 11 15 2',L,2),path('m69 64-5 10q0 6 5 5t4-6Z',BLUE)],
 'knot':[ink('M10 66q28 14 47-18 12-28-4-30-19-3-20 27t22 28q21-6 12-28-11-20-27-11t-2 23q15 11 44-16',L,7),ink('m12 65 9 3m42-40 1 8m-13 31 7-2',W,2)],
 'cloud':[dot(32,40,15,L),dot(49,31,20,L),dot(66,43,15,L),rect(17,41,64,16,L,7),path('m50 44-15 23h11l-5 17 22-29H51l6-11Z',W)],
 'rainbow':[ink('M13 68a35 35 0 0 1 70 0',L,7),ink('M24 68a24 24 0 0 1 48 0',W,6),ink('M34 68a14 14 0 0 1 28 0',G,5)],
 'oven':[rect(17,16,62,66,A,6),rect(22,34,52,37,D,4),rect(27,40,42,24,W,3),ink('M35 56q3-3 1-7m10 7q3-4 1-8m10 7q3-3 1-7',A,2),dot(28,25,3,D),dot(39,25,3,D),rect(53,23,16,3,D,1)],
 'leaf':[path('M14 72q-5-37 24-48 16-7 41-11-1 44-23 59-24 14-42 0Z',G),ink('M12 83 64 31M34 59l-2-16m8 10 18-2',D,3)],
 'wind':[ink('M11 39h46q22-1 16-15-4-10-15-4',W,5),ink('M7 52h64q18 1 14-9',SEA,4),ink('M24 65h29q19-1 14 12-3 7-13 5',L,4)],
 'grass':[path('M12 72q7-32 0-43 21 15 23 39-4-36 4-51 8 35 10 45 9-29 25-40-14 30-13 48 11-15 25-20l-16 25Z',G),ink('M13 79q30-4 66-1',W,3)],
 'bird':[path('M10 67q15-3 23-21 6-15 17-12 2-15 14-14 11 0 12 13l12 5-13 5q-6 23-29 24l-18 1-16 6Z',L),dot(67,30,2,D),ink('m47 43-14 16q12 1 20-8m-9 17-3 10m12-10-2 9',D,3)],
 'hive':[rect(16,63,64,12,G,5),rect(19,51,58,12,A,5),rect(24,39,48,12,G,5),rect(30,27,36,12,A,5),rect(37,18,22,9,G,4),oval(40,54,16,18,D),ink('M12 78h71',W,3)],
 'sieve':[path('M10 39h57q-4 28-29 29T10 39Z',L),ink('M8 37h62l17-10',W,5),ink('m20 47 27 14m-15-16 22 9m-35 1 29-11m-20 18 30-13',D,2),ink('m26 75-2 5m20-7-1 6m13-7-1 4',BLUE,2)],
 'shelf':[rect(10,60,76,7,A,2),path('m17 68 13 1-13 12Zm48 0h13l-13 13Z',W),path('M34 40q-6-13 3-16 5-2 11 1 14-6 15 7-1 11-5 21-4 7-7-6-3-11-6 0-5 15-8 2Z',W)],
 'fish':[path('M12 48q17-29 46-16 10 4 13 11l15-13-2 34-15-12q-24 30-57-4Z',SEA),dot(29,43,3,D),ink('M39 34q8 11 1 24m13-15 5 3-5 4',D,3)],
 'pear':[path('M43 25q9-7 16 7 1 11 10 21 18 29-14 30-37 3-33-21 1-10 13-22 7-7 8-15Z',G),ink('M49 26q-2-12 7-17',W,3),path('M51 22q11-14 24-9-8 14-24 9Z',SEA),ink('M30 61q-3 10 7 14',W,2)],
 'shortcut':[rect(13,17,70,63,L,5),ink('M23 65h37V30h14',D,5),ink('M24 64 59 32m-14 0h14v13',W,4)],
 'calendar':[rect(13,20,70,58,L,5),rect(18,35,60,36,W,2),rect(27,13,5,15,D,2),rect(63,13,5,15,D,2),ink('M64 52H33m10-9-10 9 10 9',D,4)],
 'snail':[path('M9 72q17-12 41-7 15-2 19-14l1-11 7 8q11 1 8 11-6 17-24 19H16Z',G),dot(40,51,22,L),ink('M31 60q-13-17 3-23 16-5 20 9 4 12-8 16-9 3-12-6-1-7 6-8',D,3),ink('m73 51-3-16m9 17 5-14',G,3),dot(69,33,3,W),dot(84,38,3,W)],
 'needle':[ink('M8 67q12-12 22-2t25 2',L,4),path('M24 77 65 23q8-11 14-4 4 5-3 11Z',W),ink('m66 31 7-9',D,2),ink('M73 22q-1-16-20-7T23 27',L,3)]}

def save_icon(name,size,shapes):
    project=docs/(name+'.pcraft'); png=images/(name+'.png')
    args=[str(cli),'run','--new',compact({'name':name,'width':size,'height':size,'background':'transparent'})]
    for i,shape in enumerate(shapes):args+=['--cmd','shape.create','--params',compact({**shape,'name':f'{name} / {i+1:02}'})]
    subprocess.run(args+['--out',str(project)],check=True,stdout=subprocess.DEVNULL)
    subprocess.run([str(cli),'convert',str(project),str(png)],check=True,stdout=subprocess.DEVNULL)
    return png

def ui_shape(n):
    k=4; attr=n.attrib; coords=lambda *keys:[float(attr.get(a,0))*k for a in keys]
    stroke={'width':7,'color':'#ffffff','cap':'round','join':'round','align':'center'}
    if n.tag=='path': return path(attr['d'],None,'#ffffff',1.75,k)
    if n.tag=='rect':return {**rect(*coords('x','y','width','height'),None,float(attr.get('rx',0))*k),'stroke':stroke}
    cx,cy=coords('cx','cy');rx=float(attr.get('r',attr.get('rx',0)))*k;ry=float(attr.get('r',attr.get('ry',0)))*k
    return {**oval(cx-rx,cy-ry,2*rx,2*ry,None),'stroke':stroke}

if __name__=='__main__':
    raw=subprocess.check_output(['node','--input-type=module','-e',"import {parts} from './design/photocraft/ui-source.mjs';console.log(JSON.stringify(parts))"],cwd=root)
    ui=json.loads(raw); jobs=[(key,96,shapes) for key,shapes in art.items()]
    jobs.extend(('ui-'+name,96,[ui_shape(n) for n in ET.fromstring('<g>'+frag+'</g>')]) for name,frag in ui.items())
    with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(lambda item:save_icon(*item),jobs))
    masks={name:base64.b64encode((images/('ui-'+name+'.png')).read_bytes()).decode() for name in ui}
    (root/'app/icon-masks.mjs').write_text('// PhotoCraft PNG masks; generated by design/photocraft/build.py\nexport default '+compact(masks)+';\n',encoding='utf8')
    print(f'{len(jobs)} PhotoCraft documents and PNG exports.')
