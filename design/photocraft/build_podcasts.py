"""Draw original offline covers for the podcast catalog with PhotoCraft."""
from concurrent.futures import ThreadPoolExecutor
from random import Random
import json
import subprocess
import sys

from build import art, cli, compact, docs, dot, ink, oval, path, rect, root
from build_arcade import art as arcade
from build_covers import EXTRA, centered

OUT = root/'app/assets/podcasts'
SIZE = 480
PAPER = '#f4e5ca'
MINT = '#9dd6c1'
CORAL = '#f2a185'
DARK = '#2b293e'
GOLD = '#eac588'
PAL = {
    'history': ('#8d6248','#382a42','#fac88d'),
    'science': ('#326e74','#203449','#a5ebd0'),
    'culture': ('#744d74','#31263f','#edc4e5'),
    'media': ('#4a638d','#242a4d','#c7d7ff'),
    'learning': ('#567353','#253544','#e2e8a9'),
    'talks': ('#945e68','#412d49','#ffd2b1'),
}
MOTIFS = {
    'vrodylo':'voice',
    'prostymy':'speech', 'bez-viiny':'signal-tower', 'kosatky':'orca', 'station451':'book-light',
    'learn-ua':'hall', 'post-pravdy':'shorts', 'local-history':'compass', 'teoriia':'atom',
    'zapakh':'nib', 'dou':'terminal', 'learn-lit':'panels', 'inshe':'mic', 'kharkiv':'tram',
    'wave':'wave', 'knyhoskhovyshche':'volumes', 'infodetox':'key', 'learn-world':'planet',
    'rozumna':'film', 'borysthenes':'sailboat', 'vorozhky':'saucer', 'narazi':'train',
    'mediumy':'photo', 'tech-basis':'wrench', 'money':'coins', 'svoboda':'notches',
    'temperatura':'bread', 'skovoroda':'flute', 'besida':'headphones', 'vyzhyly':'suitcase', 'food':'dish',
}
DRAWINGS = {
    'voice': [path('M14 14h66q8 0 8 8v43q0 8-8 8H52L33 87V73H14q-8 0-8-8V22q0-8 8-8Z',MINT),ink('M16 48h8l3-10 7 20 5-27 8 34 6-25 4 9h19',DARK,3.3),dot(77,27,4,CORAL)],
    'book-light': [path('M13 42q21-8 35 5 15-13 35-5v35q-20-6-35 7-15-13-35-7Z',CORAL),path('M13 36q21-8 35 5 15-13 35-5v36q-20-6-35 7-15-13-35-7Z',PAPER),ink('M48 44v31M20 49q12-3 21 3m-21 5q12-3 21 3m15-8q10-6 20-3m-20 11q10-6 20-3',DARK,1.8),path('M48 6q11 8 8 18-3 6-8 8-12-3-12-12 0-5 4-8-1 8 4 10 8-7 4-16Z',GOLD),ink('m30 21-6 1m40 0 7-1',CORAL,2)],
    'speech': [path('M32 33h46q7 0 7 7v19q0 7-7 7h-8v12L56 66H31Z',CORAL),path('M16 20h47q8 0 8 7v19q0 7-8 7H35L20 65V53h-4q-7 0-7-7V27q0-7 7-7Z',MINT),ink('M22 33h34m-34 9h26',DARK,2.4)],
    'orca': [path('M13 42q11-24 32-17l4-15q12 9 9 19 13 7 18 18l15-6q0 11-10 16 7 2 10 9-12 4-20-6Q52 70 29 67q-21-2-21-13 0-6 5-12Z',DARK),path('M9 53q16 9 30 2 8-3 17-4-11 12-24 15Q9 66 9 53Z',PAPER),oval(22,40,17,8,PAPER),ink('M13 77q11-5 24 0t25 0 20-1',MINT,2.6)],
    'hall': [path('M9 43 48 16l40 27Z',GOLD),rect(15,43,66,30,PAPER,2),rect(12,71,72,7,CORAL,1),rect(8,78,81,5,PAPER,1),path('M19 47h8v22h-8Zm16 0h7v22h-7Zm18 0h8v22h-8Zm17 0h7v22h-7Z',DARK),ink('M32 34h32',CORAL,2.8)],
    'atom': [ink('M11 48c0-23 74-23 74 0S11 71 11 48Zm18 32c-20-12 17-76 37-64S49 92 29 80Zm37 0C46 92 9 28 29 16S86 68 66 80Z',PAPER,2),dot(48,48,8,MINT),dot(15,53,5,CORAL),dot(72,33,5,GOLD),dot(64,77,5,MINT)],
    'terminal': [rect(11,22,74,52,DARK,6),rect(11,21,74,12,MINT,5),dot(18,27,2,DARK),dot(25,27,2,DARK),dot(32,27,2,DARK),ink('m25 44 9 7-9 7m18 0h19',PAPER,3.2),ink('M61 43h12',CORAL,2.6)],
    'volumes': [rect(12,29,20,49,CORAL,3),rect(34,20,23,58,PAPER,3),path('M59 33 72 29l13 45-13 4Z',MINT),ink('M17 38h10m-10 30h10m13-37h11m-11 8h8m-8 28h11m14-27 6-2m1 31 6-2M9 81h80',DARK,2.1)],
    'saucer': [ink('m31 57-12 25m47-25 9 25M13 24h8m-4-4v8m59-6h8m-4-4v8',MINT,1.8),oval(32,26,32,32,MINT),oval(11,40,74,22,CORAL),oval(13,41,70,13,PAPER),dot(24,48,2.3,DARK),dot(36,50,2.3,DARK),dot(49,50,2.3,DARK),dot(62,50,2.3,DARK),dot(74,48,2.3,DARK)],
    'coins': [oval(15,54,39,23,CORAL),rect(15,52,39,14,CORAL),oval(15,45,39,23,GOLD),oval(21,49,27,15,PAPER),dot(65,38,20,MINT),dot(65,38,15,DARK),ink('M65 30v16m-6-8h12M27 56h13m-7-4v8',PAPER,2.2)],
}

def render(job):
    slug,topic=job
    rng=Random(slug)
    light,dark,accent=PAL[topic]
    layers=[('Paper',rect(0,0,96,96,{'gradient':{'stops':[[0,light],[1,dark]],'angle':59+rng.randrange(34)}})),
            ('Signal field',dot(48,46,37,accent+'2b')),('Label ring',path('M15 46a33 33 0 1 0 66 0a33 33 0 1 0-66 0Z',None,accent+'76',.45)),
            ('Registration',ink('M7 13V7h6m70 82h6v-6M7 81h9m64-69h9',accent+'db',.75))]
    specks=''.join(f'M{rng.randrange(8,89)} {rng.randrange(10,87)}h.4' for _ in range(35))
    layers.append(('Paper grain',ink(specks,accent+'78',.38)))
    wav=''.join(f'M{x} {84-h/2}v{h}' for x in range(31,66,3) for h in [rng.randrange(2,12)])
    layers.append(('Waveform',ink(wav,accent+'d0',.8)))
    name=MOTIFS[slug]; shapes=DRAWINGS.get(name) or EXTRA.get(name) or art.get(name) or arcade[name]
    layers.extend((f'Subject {i+1}',centered(s,.79,48,45)) for i,s in enumerate(shapes))
    args=[str(cli),'run','--new',compact({'name':f'Podcasts / {slug}','width':SIZE,'height':SIZE,'background':'transparent'})]
    for label,shape in layers:
        args+=['--cmd','shape.create','--params',compact({**centered(shape,5,SIZE/2,SIZE/2),'name':label})]
    webp=OUT/f'{slug}.webp'
    if '--editable' in sys.argv:
        project=docs/f'podcast-{slug}.pcraft'
        subprocess.run(args+['--out',str(project)],check=True,capture_output=True)
        subprocess.run([str(cli),'convert',str(project),str(webp),'--quality','89'],check=True,capture_output=True)
    else:
        subprocess.run(args+['--out',str(webp),'--quality','89'],check=True,capture_output=True)

if __name__=='__main__':
    command="import {podcasts} from './app/podcasts.mjs';console.log(JSON.stringify(podcasts.map(p=>[p.id.slice(4),p.topic])))"
    jobs=json.loads(subprocess.check_output(['node','--input-type=module','-e',command],cwd=root,text=True))
    assert {p[0] for p in jobs}==MOTIFS.keys()
    wanted=set(sys.argv[2:])-{'--editable'}
    if not wanted<=MOTIFS.keys():raise SystemExit('Unknown podcast slug.')
    OUT.mkdir(exist_ok=True,parents=True)
    with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(render,[p for p in jobs if not wanted or p[0] in wanted]))
    print(f'PhotoCraft podcast covers: {len(wanted) or len(jobs)}')
