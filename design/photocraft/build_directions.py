"""Square catalog prints. Each named shape is editable in PhotoCraft."""
from concurrent.futures import ThreadPoolExecutor
import subprocess
import sys

from build import cli, compact, docs, dot, ink, oval, path, rect, root
from build_covers import centered

SIZE = 480  # Draw on a 96-unit grid, export at 5x.
OUT = root / 'app/assets/directions'
PAPER = '#f7e8ce'; DARK = '#242232'; SHADOW = '#151328'

def youtube():
    return [
        ('Reel rim', dot(68,32,19,'#ec997c')), ('Reel inset', dot(68,32,15.8,'#a84f56')),
        ('Spool openings', path('M67 20q5-2 6 2t-5 4q-5-1-1-6Zm11 7q5 1 3 6t-6 0q-2-4 3-6Zm-2 13q2 5-4 6t-5-4q2-4 9-2ZM58 38q-4-4 1-7t7 1q0 5-8 6Z',DARK)),
        ('Spool pin', dot(69,32,1.6,PAPER)),
        ('Board shadow', path('M13 51 75 38 81 68 18 82Z',SHADOW)),
        ('Board face', path('M12 47 73 35 79 65q.5 2-2 3L20 80q-2 .5-3-2Z','#f29579')),
        ('Board foot', path('M18 73 78 61l1 6-60 13Z','#cf676b')),
        ('Slate rails', path('M11 44 71 32l2 8-61 13Z',PAPER)),
        ('Lower chevrons', path('m20 42 8-1 7 6-8 2Zm18-3 8-2 7 6-8 2Zm18-4 8-2 7 6-9 2Z',DARK)),
        ('Lifted clapstick', path('M10 43 56 12l5 7-47 32Z',PAPER)),
        ('Upper chevrons', path('m17 39 6-5 9 3-7 5Zm13-9 7-5 9 3-7 5Zm14-10 7-4 8 3-7 5Z',DARK)),
        ('Hinge', dot(15,47,4.1,'#b35b60')), ('Pin', dot(15,46.8,1.45,PAPER)),
        ('Play triangle', path('M39 51.5 54 56 42 65Z',DARK)),
        ('Ruled slate', ink('m24 71 15-3m6-1.2 19-4M22 59l8-1.6',PAPER,1.05)),
        ('Motion lines', ink('m12 30-3-3m10-3-1.5-4m6.8 1 1-3.8','#ffd19c',1.4)),
    ]

def shorts():
    return [
        ('Echo of frame',path('M36 15 72 20l-9 65-36-4Z','#549894')),
        ('Back of case',path('M31 12 68 17q4 .5 3.5 5l-8 61q-.5 3-4 3L25 82q-4-.5-3.5-5L28 16q.5-4 3-4Z',SHADOW)),
        ('Case',path('M30 11 66 15q4 .5 3.5 5l-8 60q-.5 4-4 3.5L23 79q-4-.5-3.5-5l7-59q.5-4 3.5-4Z','#b1e6cb')),
        ('Glass',path('m29 17 37 4-7 55-36-4Z','#253d4b')),
        ('Video background',path('m31 21 32 3.5-5 42-32-4Z','#5cafa4')),
        ('Spotlight',path('m32 21 12 1.5-11 40.5-7-.8Z','#7bc2ad')),
        ('Floor',path('m27.3 53.3 32 3.7-1.3 9.5-32-4Z','#467e85')),
        ('Dancer legs',ink('M43 46.5 39 52l-8-1.4m12-4.1 6.6 5.5 1 9',DARK,3.6)),
        ('Sneakers',ink('m30.8 50.6-1.2 2m20.9 8.9 3.4.3',PAPER,2.25)),
        ('Dancer arms',ink('m41.1 36.8-6.2 1-3.7-6.3m16 5.3 5.5 2.7 4-6.3',PAPER,2.65)),
        ('Windbreaker',path('M39 36q3-2 7-.7l3.5 2.3-1.2 4.4-2-.6-1.3 6.9-8-1.1 2.2-7.1-2.1.3-.7-3.2Z','#ffa589')),
        ('Head',dot(44.8,31.8,3.1,PAPER)), ('Cap',path('M41.9 31.5q-.3-4.2 3.5-3.7 2.8.3 2.8 3l2.4 1.4-5.4-.2Z',DARK)),
        ('Timeline',ink('m27 68 26 3.2','#73919b',1.35)),('Trimmed clip',ink('m27 68 13.4 1.7',PAPER,1.35)),
        ('Seek head',dot(40.5,69.7,1.6,'#ffa589')),('Earpiece',ink('m42 15 12 1.5',DARK,1.4)),
        ('Swipe up',ink('m74 47 7-11 3.2 7.3m-3.2-7.3-7.5 2','#f7c493',1.7)),
        ('Speed marks',ink('m13 48 6 .8m-9.5 5 8 .9m-4.5 5 3.8.6',PAPER,1.1)),
    ]

def music():
    return [
        ('Deck feet',path('M14 65h9v10h-9Zm57 2h9v7h-9Z',SHADOW)),
        ('Cabinet',path('M11 30 77 23l9 38v7l-67 9-8-37Z','#705286')),
        ('Enamel top',path('M11 30 77 23l9 38-67 9Z','#cca9df')),
        ('Lip',ink('m19.5 70 66-9','#f7c5c9',1.4)),
        ('Platter edge',oval(17,31,48,31,'#805f91')),('Vinyl',oval(17,29,48,31,DARK)),
        *[(f'Groove {i}',path(f'M {41-r} 44.5 a{r} {r*.61} 0 1 0 {r*2} 0a{r} {r*.61} 0 1 0 {-r*2} 0Z',None,'#756c8e',.55)) for i,r in enumerate([13,16,19,21.2])],
        ('Groove glints',ink('M22 45q1-7 11-10m13 22q9-2 12-6',PAPER,.85)),
        ('Center label',oval(33,39.5,16,10,'#f3968d')),('Label band',path('m34 46 11-5 1.8 1.2-11 5Z','#ffd0a0')),
        ('Spindle',dot(41,44.5,1.15,DARK)),('Tonearm pivot',oval(63,28,11,8,DARK)),('Pivot inset',dot(68.5,31.5,2.2,PAPER)),
        ('Tonearm shadow',ink('m69.5 34 2.4 12.8-13 6.5-5.8-.9',DARK,3.4)),
        ('Bent tonearm',ink('m68.5 31.5 2.2 12.9-13 6.4-5.7-.9',PAPER,2.1)),
        ('Cartridge',path('m49 47 7 1.2-1 4.5-7.3-1.5Z','#80c9ba')),
        ('Speed selector',oval(71,53.5,7,4.2,DARK)),('Start button',dot(24.7,63.7,2.4,PAPER)),
        ('Lead',ink('M80 66q12-1 10 6-2 7-15 8',PAPER,1.4)),
    ]

def instagram():
    return [
        ('Photo paper',path('M46 16 78 10l6 27-32 6Z',PAPER)),('Photo sky',path('m49 18 27-5 3.5 16-27 5Z','#82c6c3')),
        ('Photo sun',dot(68,19,3.4,'#ffe0a6')),('Photo hills',path('m51.6 29 9-8 7 4 6-7 5 6.4 1 4.6-27 5Z','#517e86')),
        ('Wrist strap',ink('M15 45q-9 1-9 11 0 12 15 17 6 3 14 .3','#e8ac81',1.8)),
        ('Camera depth',path('M13 40 76 35l7 4 1 27q0 3-3 3.5L21 76q-3 .3-5-2Z',SHADOW)),
        ('Rangefinder top',path('M13 38.5 19 32l12-1 .6-4.5 15-1.7 3 5 23-2 7 6.8-1 9-65 8Z','#f9d7bd')),
        ('Front enamel',path('M13 39 80 32.8 81.3 65q.2 2.5-2.3 3L17.4 75q-2.5.4-2.6-2.5Z','#d5819f')),
        ('Leather panel',path('m14 48 66.6-6.7.7 19.6L15 68Z','#72506d')),
        ('Face rim',ink('m18 71 59.5-6.6',PAPER,1.4)),('Knurled shutter',path('m19 31.7 9-.8v3.2l-9 .7Z',DARK)),
        ('Viewfinder',path('m61 37 12-1.2.3 6.7-12.1 1.3Z',DARK)),('Viewfinder glass',path('m63.5 38.2 6.8-.6.1 2.6-6.8.7Z','#a1d7d6')),
        ('Focus window',dot(22.4,45.1,2.35,PAPER)),('Lens mount',dot(46,53.5,15.9,'#ebc2ac')),
        ('Focus ring',dot(45.1,52.1,15.2,DARK)),('Machined rim',dot(45.1,52.1,12.35,'#d4c1bb')),('Lens bezel',dot(45.1,52.1,10.9,DARK)),
        ('Glass',dot(45.1,52.1,8.1,'#4e6480')),('Iris',dot(45.1,52.1,4,DARK)),('Reflection',ink('M38.5 51q.9-4.8 5.7-5.8','#addef0',1.7)),
        ('Specular fleck',dot(48.2,55.5,1.45,'#eaaac4')),('Flash',ink('m15 22 1.4-4.8m-5 5.4-2-2m8.7 3.8 3.3-1',PAPER,1.3)),
    ]

def art_media():
    return [
        ('Cloth binding',path('m9 32 31-9 7 .9 32-9.1 7 46.3-31.5 12.4-6.3.4-32 10Z','#975966')),
        ('Page block',path('m10.5 30 32-9.5 6.7 2.2 29.2-8.4 7.3 45.5L55 71.3l-6.8 1.1L17 82Z','#c6a789')),
        ('Left leaf',path('M10.5 28q18-8 31.3-9.6l8.5 48.5Q32 69 17 77Z',PAPER)),
        ('Right leaf',path('M41.8 18.4q4.1 .1 7.3 1.8l29.7-8.5 6.6 44.8-29.7 10.4q-3.3-1-5.4 0Z','#f5d8a3')),
        ('Leaf crease',ink('m43 21 7.6 42.2','#b88970',1.1)),
        ('Margin rules',ink('m18 31 14.7-4.7m-14 8.2 9-2.9m-5.9 33.1 16-5m-15.6 8.3 12-3.7','#b59683',.95)),
        ('Bird body',path('M23 51q14 2 22.8-12.7 3.5-6.5 8.8-5.1 3.6 1 4.3 4.2l6.3.6-6.9 2.9Q57.5 56 44 58q-7.6 1.1-13.5-1.6l-7.2 3.1 2.4-5.2-7.3-.4Z','#3f7e91')),
        ('Bird wing',path('M31.5 51q9.5-2.4 16.6-9.9-1.9 11.5-12.8 13.5Z','#8ac5b4')),
        ('Chest',path('M49 54.7q7.5-4.6 9.2-11.2-6.5 1.9-9.2 11.2Z','#e89e70')),
        ('Eye',dot(54.6,36.7,1,DARK)),('Twig',ink('m39.2 61 12-3.9m-7-2.2.5 4.2m3.2-4.1.2 2.4',DARK,.9)),
        ('Corner ornament',path('M68 24q-11 4-8 10 8-2.6 8-10Zm2-2q1.4 6 7.8 4.4-2.5-5-7.8-4.4Z','#b57b52')),
        ('Pencil shadow',path('m64 68 16.5-38.5 3.5 1.8-16.6 38.5-4.4 3Z','#cda581')),
        ('Pencil lacquer',path('m62.6 66.2 17-39.8 5.2 2.2-17 39.8-5.2 4.3Z','#de8967')),
        ('Pencil facet',path('m65.7 67.6 17.1-40.1 2 .9-17 40.1Z','#a65559')),
        ('Sharpened wood',path('m62.6 66.2 5.2 2.2-5.9 6.4Z',PAPER)),('Graphite',path('m62.3 71.2 2.2.8-2.6 2.8Z',DARK)),
    ]

def games():
    return [
        ('Handheld depth',path('M9.5 40q.2-6 6-7l58-10q7-1 9 5l5 27q1 6-5 8l-57.5 12q-6.8 1.6-8.3-5.2Z',SHADOW)),
        ('Moulded body',path('M9 36.7q-.3-6 6.3-7l59-9.9q6.4-.8 8 5.6l4.1 27q.6 6-5.6 7.4L22 71.5q-6.2 1.2-7.3-5.1Z','#aabde8')),
        ('Left end',path('M9 36.7q-.3-6 6.3-7l8.8-1.5 6.7 41.4-9 1.9q-6.2 1.2-7.3-5.1Z','#b3a3e1')),
        ('Right end',path('m67 21.1 7.3-1.3q6.4-.8 8 5.6l4.1 27q.6 6-5.6 7.4l-7 1.4Z','#ed9c98')),
        ('Display bezel',path('m25.7 30.9 39.7-7 5.4 34.1-39.3 8.4Z',DARK)),
        ('Display sky',path('m29 33.5 34.1-6 4.4 27.4-33.5 7.3Z','#83baca')),
        ('Pixel cloud',path('m35 37.7 2.2-.4-.4-2.5 4.8-.8.4 2.4 3.1-.5.4 2.4-10.2 1.9Z',PAPER)),
        ('Distant hills',path('m31.3 47.7 4.2-.9-.5-3.5 4.7-.9.6 3.5 3.7-.7-.4-2.8 5.8-1.1.9 5.4 4.7-.9-.6-3.5 4-.9-.5-3.2 6.6-1.3 2.8 17.5-33.4 7.4Z','#609b9c')),
        ('Floating islands',path('m33.2 55.3 12.1-2.5.5 3.8-3.3.7.5 2.9-9.1 1.9Zm17.3-8.5 15.1-3 .8 5.2-7.5 1.5.4 2.8-5.6 1.1-.6-3.4-2 .4Z','#485b76')),
        ('Grass pixels',ink('m33 55.3 12.1-2.5m5.3-6 15.3-3','#caf495',1.9)),
        ('Flag pole',ink('m58.3 44.7-1.5-10.4',PAPER,1.15)),('Pennant',path('m56.8 34.3 5.9.5-5.1 3.6Z','#ed867d')),
        ('Player',path('m38 49 1.6-.3-.4-2.1 3-.6.3 2.1 1.6-.3.6 3.7-6 1.2Z','#ffdc91')),
        ('Left stick',dot(18.3,40.5,4.35,'#635e90')),('Stick cap',dot(18,39.8,3.3,DARK)),
        ('D-pad',path('m19.2 50 2.6-.5.6 3.5 3.1-.6.5 2.6-3.2.6.7 3.5-2.8.6-.7-3.5-3 .6-.5-2.6 3.2-.6Z',DARK)),
        ('Buttons',path('M72 32a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0Zm4.4 3.2a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0Zm-7.2 1.1a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0Zm4.5 3.1a1.9 1.9 0 1 0 3.8 0 1.9 1.9 0 1 0-3.8 0Z',DARK)),
        ('Speaker slots',ink('m76.8 48.6 2.6-.5m-2.2 2.8 2.7-.5',DARK,1.05)),
    ]

def podcasts():
    return [
        ('Outer signal',ink('M64 18q17 5 21 21m-19-14q11 3 13 12','#a4e2d5',1.4)),
        ('Cable',ink('M55 78q10 13 24 3 5-4 15-3','#d3a4a3',2.2)),
        ('Base shadow',oval(13,73,62,13,SHADOW)), ('Stand foot',oval(16,69,57,12,'#567c85')),
        ('Stand face',oval(16,67,57,10,'#9bc8c4')), ('Post',rect(43,52,7,21,'#8c5d69',2)),
        ('Yoke',ink('M24 37 20 49q-3 13 10 17t21-8l4-10',SHADOW,6)),
        ('Yoke rim',ink('M24 35 20 47q-4 13 10 17t21-8l4-10','#f2aa8c',3.8)),
        ('Mic depth',path('M29 24q5-12 18-9t12 18l-7 21q-4 13-17 10T23 46Z',DARK)),
        ('Enamel capsule',path('M28 21q4-12 18-8t11 17l-7 22q-4 13-17 9T21 43Z','#d98b7b')),
        ('Grille',path('M28 21q4-12 18-8t11 17l-5 15-28-9Z','#fae0c4')),
        ('Grille grooves',ink('m31 22 19 6m-21-1 19 6m-21-1 19 6','#745467',1.65)),
        ('Indicator',dot(36,48,3.1,DARK)), ('Indicator glass',dot(36,47.5,1.5,'#a4e2d5')),
        ('Signal strip',path('M57 52 83 45q3-1 4 2l4 14q1 3-2 4l-26 7q-3 1-4-2l-4-14q-1-3 2-4Z','#305061')),
        ('Signal trim',ink('m59 54 24-6m-21 21 25-7','#7ca9a9',.85)),
        ('Waveform',ink('m61 62 5-1 1-4 4 6 1-9 4 4 7-2','#c4e3c9',1.3)),
        ('Spark',ink('m13 26 8-3m-5-3 2 9','#ffcf9f',1.4)),
    ]

series={
    'youtube':(youtube,'#864958','#412b43','#ffb288'), 'shorts':(shorts,'#356d6c','#203d4b','#a3e4ca'),
    'music':(music,'#65527f','#342b53','#e3b0d7'), 'instagram':(instagram,'#88526e','#45304b','#ffbac5'),
    'art':(art_media,'#8a634c','#483947','#ffd59c'), 'games':(games,'#455e86','#2c3455','#adcfef'),
    'podcasts':(podcasts,'#427077','#324057','#c0e7d8'),
}

def render(category):
    draw,light,dark,accent=series[category]
    layers=[('Paper', rect(0,0,96,96,{'gradient':{'stops':[[0,light],[1,dark]],'angle':65}})),
            ('Screenprint',dot(49,45,35,accent+'20')),
            ('Diagonal hatch',ink('M0 69 20 49m-20 25 22-22M0 79l24-24m48-36L91 0m-16 21L96 0m-18 23L96 5',accent+'45',.6)),
            ('Ground',oval(13,73,71,8,'#12132240')),
            *draw(),
            ('Registration',ink('M6 11V6h5m73 84h6v-6',accent+'a6',.85))]
    project=docs/f'direction-{category}.pcraft'
    args=[str(cli),'run','--new',compact({'name':f'Directions / {category}','width':SIZE,'height':SIZE,'background':'transparent'})]
    for label,shape in layers:
        args.extend(('--cmd','shape.create','--params',compact({**centered(shape,SIZE/96,SIZE/2,SIZE/2),'name':label})))
    subprocess.run(args+['--out',str(project)],check=True,capture_output=True)
    subprocess.run([str(cli),'convert',str(project),str(OUT/f'{category}.webp'),'--quality','92'],check=True,capture_output=True)

if __name__=='__main__':
    OUT.mkdir(exist_ok=True,parents=True)
    wanted=sys.argv[2:] or list(series)
    if not set(wanted)<=series.keys():raise SystemExit('Unknown direction ID.')
    with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(render,wanted))
    print(f'PhotoCraft direction prints: {len(wanted)}')
