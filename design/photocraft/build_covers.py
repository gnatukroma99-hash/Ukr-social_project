"""Render the 1:1 offline catalog covers using PhotoCraft shape layers."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from math import cos, sin, tau
from random import Random
import subprocess
import sys

from build import art, cli, compact, docs, dot, ink, oval, path, rect, root

SIZE = 640
OUT = root / 'app/assets/covers'
GROUPS = {
    'yt': ('film', 'hive', 'horizon', 'shorts', 'shelf', 'rainbow', 'notches', 'calendar'),
    'sh': ('film', 'wave', 'oven', 'wind', 'tiles', 'cat', 'bolt-grid', 'shortcut'),
    'mu': ('tape', 'pulse', 'wind', 'leaf', 'drop', 'wave', 'horizon', 'bird'),
    'in': ('shorts', 'photo', 'tram', 'photo', 'nib', 'pear', 'grass', 'dish'),
    'ar': ('shelf', 'leaf', 'panels', 'nib', 'film', 'shelf', 'wave', 'tiles'),
    'gm': ('pad', 'signal-tower', 'film', 'pad', 'bolt-grid', 'planet', 'knot', 'key'),
}
PALETTES = (
    ('#492a41', '#211a2b', '#bf7e9e', '#f3d4a6'),
    ('#214448', '#172431', '#609b96', '#deefad'),
    ('#423767', '#1d1b34', '#9b86c7', '#f3ce93'),
    ('#653832', '#261e2d', '#c67b65', '#ffdda9'),
    ('#30476b', '#1a2539', '#7396bc', '#f4d5a9'),
    ('#41503e', '#1b2830', '#85a56f', '#edd79e'),
    ('#504056', '#232335', '#ba88b2', '#e6e8ae'),
    ('#633e33', '#30263a', '#bc8b71', '#b7e4c8'),
)
EXTRA = {
    'bolt-grid': [path('M47 7 16 55h25L34 89 81 39H53l8-32Z','#f3e9d7'),ink('M10 41h12m42 21h21M63 18h14M11 73h16','#81cebb',4)],
    'pulse': [dot(48,48,39,'#25232c'),ink('M7 53h22l8-19 10 34 12-44 9 29h21','#ed9ab9',5),ink('M35 18h26m-26 60h26','#f3e9d7',2)],
    'tram': [rect(17,14,63,61,'#efb282',9),rect(24,21,49,29,'#25232c',5),ink('M48 23v24m-20 14h8m24 0h8M32 75 16 89m47-14 16 14M22 84h52','#f3e9d7',3),ink('M48 14v-6m-15 0h30','#81cebb',3)],
    'dish': [dot(48,48,39,'#f3e9d7'),dot(48,48,32,'#9dbfe5'),dot(48,48,28,'#f3e9d7'),path('M25 55q8-13 17-7 6-13 18-12 8-8 16-3l-10 8q-6 18-24 18l-12 6z','#25232c'),ink('M23 33q7 0 12 8m28 20q8-1 13-8','#81cebb',3)],
    'panels': [rect(13,11,70,73,'#f3e9d7',7),rect(20,19,28,29,'#c4a3f4',3),rect(52,19,24,29,'#efb282',3),rect(20,53,56,23,'#81cebb',3),ink('m25 40 8-12 10 10m16-10 9 11m-39 29 11-9 9 8 8-6 9 8','#25232c',3)],
    'signal-tower': [dot(48,46,35,'#c4a3f4'),path('M28 79 45 21h7l16 58h-9l-5-17H42l-5 17z','#25232c'),ink('M44 54h8m-29-2 52 1M32 39h30M22 82h53','#f3e9d7',3)],
    'planet': [dot(48,44,33,'#efb282'),path('M21 57q15-9 28 0t28-1q-7 21-29 21T21 57Z','#bd747b'),dot(41,35,6,'#c68079'),dot(64,44,4,'#c68079'),ink('M16 58C-3 74 6 80 30 72 51 65 84 46 90 32q5-10-14-7','#f3e9d7',3)],
    'key': [dot(35,35,23,'#efb282'),dot(35,35,10,'#25232c'),path('M45 43 82 77 76 85 67 78 66 70 57 70 38 51Z','#f3e9d7'),ink('M62 21h14m-7-7v14M14 71h16m-8-8v16','#c4a3f4',3)],
}


def centered(layer, scale, cx=320, cy=290):
    """Scale the 96px PhotoCraft motif into the square panel."""
    layer = deepcopy(layer)
    x, y = cx-48*scale, cy-48*scale
    if 'rect' in layer:
        a,b,w,h = layer['rect']
        layer['rect'] = [x+a*scale, y+b*scale, w*scale, h*scale]
        if layer.get('radii'):
            layer['radii'] *= scale
    else:
        for sub in layer['path']['subpaths']:
            for knot in sub['knots']:
                for key, (a,b) in knot.items():
                    knot[key] = [round(x+a*scale, 3), round(y+b*scale, 3)]
    if layer.get('stroke'):
        layer['stroke']['width'] *= scale
    return layer


def build(job):
    id, group, index, motif, editable = job
    light, dark, line, accent = PALETTES[(index + group*3) % len(PALETTES)]
    rng = Random(id)
    cx, cy = 320, 300
    colors = {'gradient': {'stops': [[0,light],[1,dark]], 'angle': 65 + 9*index}}
    shapes = [('Paper', rect(0,0,SIZE,SIZE,colors)), ('Halo', dot(cx,cy,198,line+'32'))]
    arcs = ''.join(f'M{cx-r} {cy}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0Z' for r in (163,202,230))
    shapes.append(('Orbit', ink(arcs,line+'a0',2)))
    shapes.append(('Grid', ink(''.join(f'M{x} 91v438M91 {x}h458' for x in range(100,561,55)),line+'38',1)))
    shapes.append(('Grain', ink(''.join(f'M{rng.randrange(28,611)} {rng.randrange(28,611)}h1' for _ in range(80)),accent+'70',1.4)))
    if index%3==0:
        shapes.append(('Diagonal',path('M0 468 640 126v64L0 532Z',line+'47')))
    elif index%3==1:
        shapes.append(('Offset disc',dot(467,193,82,accent+'2b')))
    else:
        shapes.append(('Color band',path('M0 445q163 53 320 0t320 0v83q-162-54-320 0T0 528Z',line+'61')))
    shapes.extend((f'Subject {i+1}', centered(layer, 3.5, cx, cy)) for i,layer in enumerate(EXTRA.get(motif) or art[motif]))
    outline = 'M36 99V37h61m446 0h61v62M36 541v62h61m446 0h61v-62M60 559h520'
    shapes.append(('Trim', ink(outline,accent+'90',2)))
    shapes.append(('Index', path(''.join(f'M{66+i*20} 574h10v10h-10Z' for i in range(index+1)),accent)))
    bars = ''.join(f'M{489+i*11} 581v{-rng.randrange(5,24)}' for i in range(8))
    shapes.append(('Meter', ink(bars,accent+'d0',3)))
    args = [str(cli),'run','--new',compact({'name':f'Catalog / {id}','width':SIZE,'height':SIZE,'background':'transparent'})]
    for name,shape in shapes:
        args.extend(('--cmd','shape.create','--params',compact({**shape,'name':name})))
    webp=OUT/f'{id}.webp'
    output=docs/f'cover-{id}.pcraft' if editable else webp
    run = subprocess.run(args+['--out',str(output)]+([] if editable else ['--quality','86']),capture_output=True)
    if run.returncode:
        raise RuntimeError(f'{id}: {run.stderr.decode(errors="replace")}')
    if editable:
        subprocess.run([str(cli),'convert',str(output),str(webp),'--quality','86'],check=True)


if __name__=='__main__':
    OUT.mkdir(exist_ok=True,parents=True)
    wanted = set(sys.argv[2:]) - {'--editable'}
    editable = '--editable' in sys.argv
    jobs = [(f'{key}-{i+1}', group, i, motif, editable) for group,(key,motifs) in enumerate(GROUPS.items())
            for i,motif in enumerate(motifs) if key!='mu' or i!=0]
    jobs = [job for job in jobs if not wanted or job[0] in wanted]
    if not jobs:
        raise SystemExit('No matching cover IDs.')
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(build,jobs))
    print(f'PhotoCraft square covers: {len(jobs)}')
