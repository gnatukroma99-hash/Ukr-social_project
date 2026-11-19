"""Draw the vocabulary album as editable PhotoCraft shape layers."""
from concurrent.futures import ThreadPoolExecutor
from random import Random
import subprocess
import sys
from build import W,L,G,D,PINK,BLUE,A,SEA,compact,cli,dot,ink,oval,path,rect,root,docs
from build_covers import centered

RED='#ec786a'; Y='#f3cd75'; NAVY='#222633'; BROWN='#ae785a'; ICE='#d0ebe6'
SIZE=352
OUT=root/'app/assets/arcade'

art={
 'hedgehog':[path('m9 56 1-13 9 2 2-13 10 3 4-13 9 7 10-10 5 11 11-6 2 12 10 1-5 14-10 18H24Z',BROWN),oval(16,49,52,32,A),path('M47 56q13-12 25 3l14 4q-5 17-23 17H46Z',W),dot(83,65,4,D),dot(64,60,2.5,D),ink('m24 47 4-8m9 10 4-10m10 10 5-12',D,3),ink('M30 80v4m27-4v4',Y,4)],
 'fox':[path('M47 79Q56 37 86 44Q91 73 61 83Z',A),path('M73 48q8-5 13-4 2 10-2 18l-8-7-7 1Z',W),path('M14 31 18 12 33 26 50 26 64 13 65 42Q59 63 41 68 19 59 14 44Z',RED),path('M15 43q17 0 26 16 10-15 24-17-4 19-24 26-21-7-26-25Z',W),dot(40,60,3,D),ink('m23 43 5-1m24 1 5-1',D)],
 'squirrel':[path('M50 66q11-9 6-20-16-31 7-35 15-4 22 12 10 22-10 44-10 10-25 8Z',A),ink('M63 58q19-18 9-34',BROWN,3),oval(24,42,36,40,RED),oval(15,26,34,30,RED),oval(19,16,9,19,RED),oval(30,13,8,15,A),oval(13,43,22,14,W),dot(27,38,3,D),oval(14,57,13,11,BROWN),ink('m23 57 8 6m8 17-10 3',W,4)],
 'rabbit':[oval(18,49,54,32,ICE),oval(10,37,40,33,W),oval(17,9,11,36,W),oval(31,9,11,34,W),oval(20,15,5,20,PINK),oval(34,15,5,20,PINK),dot(21,49,3,D),dot(12,55,3,PINK),dot(72,61,9,W),oval(45,68,26,13,BLUE),ink('m31 72-14 8m35 2 19 0',W,4)],
 'frog':[oval(17,59,63,18,SEA),oval(22,41,53,35,G),dot(32,43,12,G),dot(64,43,12,G),dot(32,42,6,W),dot(64,42,6,W),dot(32,42,2.6,D),dot(64,42,2.6,D),ink('M35 58q13 10 27 0',D,3),ink('m25 71-13 7m59-7 13 7',G,5),ink('M13 83q14 4 28 0m17 0q10 3 24-1',SEA,2)],
 'bee':[oval(23,19,25,25,ICE),oval(43,15,27,27,BLUE),path('M12 55 24 49v13Z',D),oval(22,37,56,32,Y),path('M37 37h7q-9 17 0 32h-7q-9-15 0-32Zm14 0h7q-9 17 0 32h-7q-9-15 0-32Z',D),dot(77,51,10,A),dot(80,49,2,D),ink('m76 42-3-9m9 9 5-8M17 75q17 10 29 3',W,2.4)],
 'owl':[path('M19 31 17 16 37 24q11-3 22 0l19-8-2 15 1 26q0 24-29 26-29-2-29-26Z',L),oval(27,53,42,27,W),dot(34,40,14,ICE),dot(61,40,14,ICE),dot(34,40,5,D),dot(61,40,5,D),path('M42 46h12l-6 10Z',Y),ink('m33 65 5 3 5-3m10 0 4 3 5-3M35 80v6m25-6v6',BROWN,3)],
 'butterfly':[path('M45 53q-33-4-32-30 0-12 14-9 16 3 20 32-3-25 17-31 14-4 19 8 6 23-32 30 28-2 25 14-4 17-14 11-11-6-15-22-2 16-15 22-10 5-14-11-3-14 27-14Z',PINK),oval(23,25,14,16,L),oval(60,24,14,16,L),dot(29,64,5,W),dot(65,64,5,W),ink('M47 69V44m0 1-8-12m8 12 8-12',W,3)],

 'scissors':[path('M33 53 76 17q11 15-30 46ZM55 54 18 17q-8 14 23 47Z',ICE),oval(15,47,30,32,PINK),oval(47,47,31,32,PINK),oval(22,54,15,17,NAVY),oval(56,54,15,17,NAVY),dot(45,51,5,L)],
 'brush':[path('M21 75q-5-16 12-21l13-3L70 20q8-7 12-2t-3 12L52 58l-1 11q-7 17-30 6Z',A),path('M20 76q-4-17 13-22l13-3 10 10-5 9q-7 16-31 6Z',ICE),path('M20 76q-3-9 1-13 9 8 20 14-7 6-21-1Z',L),ink('m42 52 12 11',D,4),dot(15,79,4,L)],
 'hammer':[path('M44 40 55 43 36 83q-5 8-12 3-5-4-1-11Z',A),path('M22 33 30 20 65 29 71 39 82 47l-6 7-17-9L25 41Z',BLUE),rect(17,28,11,14,ICE,3),ink('m30 79 17-32',BROWN,3)],
 'wrench':[path('M20 68 52 38q-4-12 6-22l9-4-4 12 10 7 12-5q-4 20-20 20L34 80q-6 8-13 1-8-6-1-13Z',BLUE),ink('m31 71 25-23',ICE,5),dot(26,75,4,NAVY)],
 'saw':[path('M9 58 62 29l16 24-8 13-5-3-3 7-5-3-3 7-5-3-3 7-5-3-3 7-6-3-4 7Z',BLUE),path('m60 32 18-14 10 9 1 19-13 12Z',A),path('m71 34 7-6 5 5v9l-6 5Z',NAVY),ink('m17 60 38-22',ICE,3)],
 'thread':[rect(27,24,42,49,RED,8),oval(21,15,54,21,A),oval(21,66,54,17,A),oval(39,20,19,9,D),ink('M29 39q16 7 38 0m-38 8q16 7 38 0m-38 8q16 7 38 0m-38 8q16 6 38 0',PINK,3),ink('M64 63q21-7 21 9 1 12-14 9',PINK,2.5)],
 'tongs':[path('M46 44 34 35l-7-8 4-14q-14 2-13 20 1 13 20 20L28 79l5 7q8 2 9-7l7-22 9 22q2 9 9 7 5-3 2-9L59 52q16-11 16-23-1-12-11-16l4 14-7 8-12 10Z',BLUE),ink('m38 61-8 19m28-19 8 19',SEA,7),dot(49,50,4,W)],
 'screwdriver':[path('M43 51 65 20l8-5 2 9-21 34Z',ICE),path('M23 74 41 45 57 56 40 82q-8 9-17 3-6-4 0-11Z',RED),ink('m29 77 15-23m-8 26 15-22',A,3)],

 'apple':[path('M49 35q-24-18-35 5-12 26 14 43 11 4 20-2 14 6 26-5 20-20 7-38-11-16-32-3Z',RED),path('M47 31q1-13 20-16-3 15-20 16Z',G),ink('m47 34-5-14',W,3),ink('M28 43q-9 7-8 16',PINK,4)],
 'watermelon':[path('M8 35h80q-2 42-40 45T8 35Z',SEA),path('M12 35h72q-3 35-36 37T12 35Z',G),path('M16 35h64q-4 29-32 29T16 35Z',RED),ink('m32 43 3 4m13 4 1 5m14-12-2 4',D,3)],
 'beet':[path('M47 40Q26 10 35 10q16 5 18 21 7-21 19-21-2 18-17 31Z',SEA),path('M48 32Q14 12 21 31q7 10 25 13Z',G),path('M47 32q-29 0-29 20 1 17 26 26l11 9-1-11q28-7 25-28-5-19-32-16Z',PINK),ink('M29 48q-7 11 5 17m24 2 9-5',RED,4)],
 'carrot':[path('M55 39q-7-23 3-26l4 19q6-23 15-22l-8 23 16-10q4 9-21 19Z',SEA),path('M49 35q15-8 23 7 1 10-43 38-15 12-12 3 17-40 32-48Z',A),ink('m42 46 7 5m-17 7 7 5m13-14 6 5',BROWN,2.7)],
 'pumpkin':[ink('M49 40q-6-24 7-24m-4 8q14-14 20-10',G,5),oval(10,37,76,42,BROWN),oval(19,34,58,46,A),oval(33,33,30,48,Y),ink('M48 39q-10 16 1 34m7-36q10 14 5 33',A,3)],
 'bread':[path('M14 65q0-32 37-38 32-5 32 22 0 26-42 30-27 4-27-14Z',BROWN),path('M13 59q5-31 40-34 31-3 30 22-1 23-40 24-28 6-30-12Z',Y),ink('M28 57q8-4 10-13m9 12q8-7 9-16m8 12q6-5 6-12',W,4),ink('M23 66q9 5 28 2',A,2.6)],
 'cherry':[ink('M27 57q4-26 25-36 14 14 13 35',G,4),path('M50 24q15-20 30-8-11 9-30 8Z',SEA),dot(28,65,15,RED),dot(65,64,15,PINK),ink('M19 63q2-6 7-7m30 5q3-6 8-6',W,3)],
 'corn':[oval(35,16,33,60,Y),ink('M43 25v38m9-41v43m9-40v31m-22-23h24m-24 8h25m-25 8h24m-24 8h23',BROWN,2),path('M44 83Q18 78 21 43q24 13 25 31 8-21 29-32-3 39-31 41Z',SEA),ink('m27 57 16 20m23-17-13 15',G,3)],

 'kettle':[path('M64 37q21-16 24 4 1 13-18 14',None,A,6),path('M27 51 12 34l8-4 16 11Z',Y),path('M21 62q2-29 27-29 24 0 29 29 0 15-28 15-28 0-28-15Z',BLUE),rect(34,32,31,7,ICE,3),dot(49,29,5,PINK),ink('M32 57q2-11 11-15M25 23q8-6 1-10',W,3)],
 'jug':[path('M57 37q29-9 26 12-3 10-17 13',None,A,6),path('M33 29 20 24q5-8 20-5l17 4-2 17q22 9 17 28-4 13-23 14-27 1-26-15 0-14 12-25Z',A),path('M26 61q20 9 46-1l1 7q-4 14-25 15-27-1-22-21Z',BLUE),ink('M29 24q11 5 24 2m-18 27q-6 6-3 11',W,3)],
 'umbrella':[path('M7 52q5-30 41-34 33 3 41 34-14-8-26 0-16-8-32 0-11-7-24 0Z',PINK),path('M31 52q1-23 17-34 16 14 15 34-16-8-32 0Z',L),ink('M48 48v25q0 12 9 12 8 0 8-8m-17-63v4',W,4),ink('m18 25 3-6m52-1 3-6',BLUE,3)],
 'lantern':[path('M37 26q-3-15 11-15t11 15',None,A,4),rect(25,30,46,43,BLUE,7),rect(32,36,32,33,Y,3),path('M47 63q-9-5-2-14 3-4 4-9 12 13 4 21-2 2-6 2Z',W),rect(21,23,54,10,A,3),rect(21,70,54,10,A,3),ink('m13 38-5-5m5 25-6 3m76-24 5-5m-5 25 6 3',Y,2.5)],
 'mitten':[path('M23 68 14 51q-5-12 2-17 6-4 16 7l1-17q3-17 22-16 18 0 20 20l-1 27q-1 12-9 18Z',RED),rect(21,65,48,16,PINK,4),ink('m31 69 0 8m10-8v8m10-8v8m10-8v8m-7-48v18m-9-9h18m-15-6 12 12m0-12-12 12',W,2.5)],
 'clock':[dot(48,49,34,A),dot(48,49,28,W),ink('M48 29v21l14 7m-14-31v2m0 41v2m-22-22h2m40 0h2',D,3),dot(48,49,3,RED),ink('m28 17-5-5m46 5 5-5m-8 66 4 6m-40-6-4 6',A,4)],
 'iron':[path('M32 47v-7q0-16 14-17h15q11 1 11 18v7',None,A,7),path('M12 68q14-27 43-28 24 0 29 28Z',BLUE),path('M12 68h72v7H12Z',ICE),dot(46,47,5,Y),ink('M20 61q17-8 33-9',W,3)],
 'grater':[path('M36 33v-9q0-10 12-10t12 10v9',None,A,5),path('M31 28h34l10 53H20Z',ICE),path('M55 29h10l10 52H56Z',BLUE),* [dot(x,y,2.7,NAVY) for y in (42,53,65) for x in (35,44,53)],ink('M17 82h61',A,4)],

 'bike':[dot(23,61,17,BLUE),dot(73,61,17,BLUE),dot(23,61,13,NAVY),dot(73,61,13,NAVY),ink('M23 61 36 39l14 23H23l10-22h27l13 21-17-35h11',Y,4),dot(50,61,5,A),ink('M31 37h12',W,4)],
 'sailboat':[path('M48 16 20 61h28Zm6 12v34h19Z',W),ink('M51 16v54',Y,3),path('M13 66h71L72 80H25Z',A),ink('M11 84q14-4 28 0t28 0l17-1',SEA,3)],
 'train':[rect(23,44,48,24,BLUE,5),rect(49,23,25,44,BLUE,4),rect(53,30,16,15,ICE,2),rect(24,32,9,16,A,2),rect(13,63,72,10,A,3),dot(30,73,9,D),dot(64,73,12,D),dot(30,73,4,W),dot(64,73,6,W),ink('M24 25q-10-5-3-9m10 8q-4-7 3-9',W,3)],
 'tram':[rect(23,27,50,50,PINK,10),rect(28,33,40,24,ICE,4),ink('M48 32v24M38 27l-6-9h25l5 9m-46-11h63M32 78l-9 9m41-9 9 9',W,3),dot(34,65,4,Y),dot(62,65,4,Y),rect(38,61,20,11,L,3)],
 'plane':[path('M13 49 38 44 49 16q4-11 10-7 4 2 2 11l-4 24 25 11q6 3 4 8L55 58l-5 18 9 9-5 3-13-6-13 4-2-5 12-9 2-17-25 2Z',ICE),ink('m49 34 5-13M20 34h14M13 66h18',BLUE,3),dot(58,17,3,BLUE)],
 'balloon':[path('M48 64Q19 39 20 26 21 8 49 8q27 0 27 18 0 17-28 38Z',RED),path('M47 63Q33 42 33 25q1-16 16-17 15 1 15 17-1 18-17 38Z',Y),ink('m42 58 0 13m12-13 0 13',ICE,2.7),rect(37,69,22,13,A,3),ink('m40 77 16 0',BROWN,2)],
 'compass':[dot(48,51,33,A),dot(48,51,27,ICE),path('m63 33-7 24-23 12 9-25Z',RED),path('m56 57-23 12 9-25Z',BLUE),dot(48,51,3,W),ink('M48 27v5m0 38v5m-24-24h5m38 0h5m-29-35v-4h10v4',D,2.5)],
 'suitcase':[path('M36 29v-9h24v9',None,W,5),rect(13,28,70,49,L,9),rect(24,28,9,49,A,2),rect(63,28,9,49,A,2),rect(31,45,17,12,SEA,3),ink('M45 63h12m-7-28h10',W,2.4),dot(27,79,3,D),dot(70,79,3,D)],

 'violin':[path('M29 52q-14 2-14 17 0 14 17 15 18-1 18-15 0-7-6-10 15-9 4-19-7-8-14 2Z',A),path('M41 52 65 17l7 6-24 35Z',BROWN),oval(63,13,13,10,A),ink('M30 70 69 20m-37 54 39-51m-43 35-4 7m17-6-4 7M64 75l17-41',W,2.4)],
 'bandura':[path('M46 34 64 11 75 15 63 42q13 33-14 42-26 9-36-18-6-20 16-29Z',Y),dot(40,60,13,BROWN),ink('m27 68 40-50M32 74l37-52M38 76l30-47M45 75l20-37M52 73l13-29m-40 29 24 6',W,2.4),dot(68,17,3,ICE)],
 'drum':[path('M17 39h62l-4 34q-26 17-53 0Z',RED),oval(17,29,62,20,W),ink('m21 45 11 31 12-28 11 29 12-31 8 25',Y,2.6),ink('M25 19 52 41m17-26L48 41',A,4),dot(53,42,3,A),dot(47,42,3,A)],
 'headphones':[path('M19 55V44q0-28 29-28t29 28v11',None,L,8),path('M25 44q0-21 23-21t23 21',None,W,2.6),rect(11,47,22,27,PINK,7),rect(63,47,22,27,PINK,7),rect(26,49,8,23,L,3),rect(62,49,8,23,L,3),ink('M76 70q2 12-14 13',L,3)],
 'mic':[rect(36,12,25,47,BLUE,12),ink('M30 47q0 20 18 20t19-20M49 67v13m-15 0h29',ICE,4),ink('M41 27h15m-16 7h17m-17 7h17m-14 7h11',D,2.5),ink('m22 32-6-5m58 5 6-5',PINK,3)],
 'flute':[path('M19 61 68 19q6-6 11 0l4 6-50 49q-5 5-10 2-8-5-4-15Z',A),path('m71 19 8-5 5 8-7 7Z',W),*[dot(x,y,2.8,D) for x,y in ((33,62),(40,55),(47,48),(54,41),(61,34))],ink('m24 59 44-38m-31-5q6-8 14-5m-29 21q4-8 11-8',Y,2.5)],
 'bell':[dot(48,74,8,A),path('M21 69q12-9 12-27 0-15 15-15t15 15q0 18 12 27-27 9-54 0Z',Y),oval(42,18,12,10,A),ink('M23 69q24 6 49 0M39 55q3-10 2-16m-21-8-6-8m62 8 6-8',W,3)],
 'ticket':[path('M17 40 79 24l4 15q-9 3-7 11 2 8 11 6l3 13-62 16-4-13q9-3 7-10-2-8-11-7Z',PINK),ink('m61 33 2 7m1 5 2 6m1 5 2 7m1 4 2 7M35 48l17-5M38 58l17-5m-15 14 10-3',W,3)],
}

papers=[('#47305a','#201a32',L),('#304d46','#1b2b32',SEA),('#543a2b','#33222e',A),('#284753','#242039',BLUE),('#4c3146','#262039',PINK),('#45502f','#232b2c',G)]

def export(item, editable):
    name,shapes=item
    rng=Random(name)
    light,dark,accent=papers[rng.randrange(len(papers))]
    cx,cy=176+rng.randrange(-9,10),174+rng.randrange(-9,10)
    paper={'gradient':{'stops':[[0,light],[1,dark]],'angle':65+rng.randrange(50)}}
    layers=[('Paper',rect(0,0,SIZE,SIZE,paper)),('Halo',dot(cx,cy,120,accent+'2a')),
           ('Frame',ink('M21 48V21h27m256 0h27v27m0 257v26h-27m-256 0H21v-26',accent+'94',2)),
           ('Shadow',oval(cx-92,279,184,18,'#13142170'))]
    for x,y in [(61,73),(286,71),(69,282),(290,265)]:
        layers.append(('Ink fleck',dot(x+rng.randrange(-9,10),y+rng.randrange(-9,10),rng.randrange(2,5),accent+'88')))
    layers.extend((f'{name} / {i+1:02}',centered(s,2.85,cx,cy)) for i,s in enumerate(shapes))
    args=[str(cli),'run','--new',compact({'name':f'Arcade / {name}','width':SIZE,'height':SIZE,'background':'transparent'})]
    for label,layer in layers:
        args+=['--cmd','shape.create','--params',compact({**layer,'name':label})]
    webp=OUT/f'{name}.webp'
    output=docs/f'arcade-{name}.pcraft' if editable else webp
    completed=subprocess.run(args+['--out',str(output)]+([] if editable else ['--quality','88']),capture_output=True)
    if completed.returncode:
        raise RuntimeError(f'{name}: {completed.stderr.decode(errors="replace")}')
    if editable:
        subprocess.run([str(cli),'convert',str(output),str(webp),'--quality','88'],check=True)

if __name__=='__main__':
    OUT.mkdir(exist_ok=True,parents=True)
    wanted=set(sys.argv[2:])-{'--editable'}
    jobs=[item for item in art.items() if not wanted or item[0] in wanted]
    if len(jobs)!=(len(wanted) if wanted else len(art)):
        raise SystemExit('Unknown arcade illustration ID.')
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda item:export(item,'--editable' in sys.argv),jobs))
    print(f'PhotoCraft arcade illustrations: {len(jobs)}')
