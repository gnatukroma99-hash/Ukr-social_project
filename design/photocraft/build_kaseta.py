"""Draw the catalog's cassette poster as editable PhotoCraft layers."""
from math import cos, radians, sin
from pathlib import Path
from random import Random
import os
import shutil
import subprocess
from tempfile import TemporaryDirectory

from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

from build import Knots, cli, compact, docs, path, root

width, height = 960, 640
project = docs / 'sadsvit-kaseta.pcraft'
cover = root / 'app/assets/covers/sadsvit-kaseta.webp'
layers = []


def command(command_id, **params):
    layers.append(['--cmd', command_id, '--params', compact(params)])


tilt = radians(-12)


def mount(shape, dx=0, dy=0):
    for subpath in shape['path']['subpaths']:
        for knot in subpath['knots']:
            for k, (x, y) in knot.items():
                x, y = x - 270, y - 150
                knot[k] = [round(478 + dx + x*cos(tilt) - y*sin(tilt), 3),
                           round(314 + dy + x*sin(tilt) + y*cos(tilt), 3)]
    return shape


def shape(name, d, fill=None, stroke=None, weight=2, *, tape=False, offset=(0, 0)):
    layer = path(d, fill, stroke, weight)
    command('shape.create', name=name, **(mount(layer, *offset) if tape else layer))


def circle(x, y, r):
    return f'M{x-r} {y}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0Z'


def gradient(a, b, angle):
    return {'gradient': {'stops': [[0, a], [1, b]], 'angle': angle}}


def subtract_counter(contour):
    points = [knot['anchor'] for knot in contour['knots']]
    return sum(x*v-y*u for (x, y), (u, v) in zip(points, points[1:] + points[:1])) < 0


def label(name, text, x, y, size, color, tracking=2, *, tape=False):
    pen = Knots(1)
    with TTFont(root / 'app/assets/Manrope.ttf') as font:
        scale = size / font['head'].unitsPerEm
        glyphs = font.getGlyphSet(location={'wght': 800})
        pen.glyphSet = glyphs
        cmap = font.getBestCmap()
        for char in text:
            glyph = glyphs[cmap[ord(char)]]
            glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x, y)))
            x += glyph.width * scale + tracking
    # PhotoCraft combines paths as shapes. Cut the counters out explicitly.
    contours = sorted(pen.subs, key=subtract_counter)
    for contour in contours:
        if subtract_counter(contour):
            contour['op'] = 'subtract'
    layer = {'kind': 'path', 'path': {'subpaths': contours}, 'fill': color}
    command('shape.create', name=name, **(mount(layer) if tape else layer))


def poster():
    command('gradient.fill.create', **{'from': [78, 43], 'to': [916, 606]},
            stops=[[0, '#30223f'], [.46, '#503857'], [1, '#211e38']])
    command('gradient.fill.create', **{'from': [515, 267], 'to': [860, 455]}, style='radial',
            stops=[[0, '#bd8aab'], [1, '#a07ca8']], transparency=[[0, 46], [1, 0]])
    shape('Signal / rings', ''.join(circle(486, 320, r) for r in (186, 219, 252)), None, '#d8b9db38', 1.5)
    shape('Signal / grid', ''.join(f'M{x} 112v416' for x in range(96, 895, 56)) +
          ''.join(f'M42 {y}h876' for y in range(124, 525, 56)), None, '#ead8ee1b', 1)
    shape('Print / frame', 'M40 82V40h42m796 0h42v42M40 558v42h42m796 0h42v-42', None, '#e8d0e392', 2)
    rng = Random(21)
    shape('Print / specks', ''.join(f'M{rng.randrange(44, 916)} {rng.randrange(43, 597)}h1' for _ in range(160)), None, '#ecd4e949', 1.5)
    shape('Signal / trace', 'M42 376h53l13-16 13 29 17-43 18 56 22-72 17 53 16-23h23M740 262h32l15-20 16 53 20-79 19 61 17-33 18 18h43', None, '#d7f58bd0', 2.8)
    shape('Print / tape mark', 'M62 66h13v13H62z', '#d7f58b')
    label('Print / side', 'СТОРОНА А', 88, 79, 18, '#f2dceb')
    label('Print / year', '2021', 840, 79, 18, '#f2dceb')
    shape('Print / footer', 'M64 565h832m0-3v6M64 562v6', None, '#e8d0e365', 1.5)
    shape('Print / meter', ''.join(f'M{775+i*10} {551-h}h4v{h}h-4z' for i, h in enumerate((7, 13, 23, 16, 30, 26, 13, 7, 19, 24, 12, 7))), '#d7f58b')
    label('Print / caption', 'ІЛЮСТРАЦІЯ ДО ТРЕКУ', 65, 550, 15, '#f2dceb', tracking=2.5)

    shell = 'M0 20Q0 0 20 0h500q20 0 20 20v260q0 20-20 20H20q-20 0-20-20Z'
    shape('Cassette / shadow soft', shell, '#140e25aa', tape=True, offset=(24, 35))
    shape('Cassette / shell edge', shell, gradient('#532f55', '#231c38', 90), '#211a30', 4, tape=True, offset=(10, 16))
    shape('Cassette / shell face', shell, gradient('#d7a5c4', '#806491', 63), '#ecd1dc', 2.5, tape=True)
    shape('Cassette / seam', 'M19 280V20q0-9 9-9h484q9 0 9 9v260q0 9-9 9H28q-9 0-9-9Z', None, '#684c7b', 2, tape=True)
    shape('Cassette / paper', 'M42 39q0-12 12-12h432q12 0 12 12v167q0 12-12 12H54q-12 0-12-12Z',
          gradient('#f7e7d8', '#dfbfd8', 85), '#725774', 1.5, tape=True)
    shape('Cassette / label stripes', 'M43 182h454v21q0 13-13 13H56q-13 0-13-13Z', '#bd86aa', tape=True)
    shape('Cassette / mint rule', 'M43 182h454m-454 8h454', None, '#f1eead', 2.5, tape=True)
    label('Cassette / title', 'КАСЕТА', 66, 74, 39, '#382535', 3, tape=True)
    label('Cassette / artist', 'SADSVIT', 350, 71, 22, '#5c425d', 1.8, tape=True)
    shape('Cassette / window', 'M73 103q0-11 11-11h372q11 0 11 11v52q0 11-11 11H84q-11 0-11-11Z',
          '#261f34', '#765c7c', 3, tape=True)
    shape('Cassette / tape', 'M148 115h244v26H148Z', '#70565e', tape=True)
    for x in (127, 413):
        shape(f'Cassette / reel ring {x}', circle(x, 129, 28), '#b18eaa', '#e3bacb', 2.5, tape=True)
        shape(f'Cassette / reel hub {x}', circle(x, 129, 16), '#332641', None, tape=True)
        teeth = ''.join(f'M{x+14*cos(a):.4f} {129+14*sin(a):.4f}L{x+21*cos(a):.4f} {129+21*sin(a):.4f}'
                        for a in (i*radians(60) for i in range(6)))
        shape(f'Cassette / reel teeth {x}', teeth, None, '#392b48', 3, tape=True)
    shape('Cassette / counter', 'M225 119h92v20h-92z', '#201b2b', tape=True)
    shape('Cassette / counter ticks', 'M237 124v10m12-7v7m12-10v10m12-7v7m12-10v10m12-7v7', None, '#d7f58b', 2, tape=True)
    shape('Cassette / head plate', 'M96 288 127 237h286l33 51Z', gradient('#4a364f', '#211b31', 92), '#e2b4cb', 2, tape=True)
    shape('Cassette / sockets', ''.join(circle(x, y, r) for x, y, r in ((144, 270, 7), (394, 270, 7), (200, 268, 11), (340, 268, 11))),
          '#181627', '#b68ca9', 1.5, tape=True)
    shape('Cassette / screws', ''.join(circle(x, y, 6) for x in (28, 512) for y in (22, 278)), '#533c62', '#e6bed3', 1.5, tape=True)
    shape('Cassette / screw slots', ''.join(f'M{x-3} {y}h6' for x in (28, 512) for y in (22, 278)), None, '#efd7df', 1.3, tape=True)


def save_poster():
    # Save between batches to stay within Windows' 32K command-line limit.
    windows_temp = Path(os.environ.get('LOCALAPPDATA', '')) / 'Temp/opencode'
    with TemporaryDirectory(prefix='svoie-kaseta-', dir=windows_temp if windows_temp.is_dir() else None) as temp:
        args = [str(cli), 'run']
        source = ['--new', compact({'name': 'SadSvit / Kaseta', 'width': width, 'height': height, 'background': 'transparent'})]
        chunk = []
        for layer in layers:
            if len(subprocess.list2cmdline(chunk + layer)) > 27000:
                if not chunk:
                    raise ValueError('A single PhotoCraft layer exceeds the command-line budget.')
                dest = str(Path(temp) / ('b.pcraft' if source == [str(Path(temp) / 'a.pcraft')] else 'a.pcraft'))
                subprocess.run(args + source + chunk + ['--out', dest], check=True, stdout=subprocess.DEVNULL)
                source, chunk = [dest], []
            chunk.extend(layer)
        dest = str(Path(temp) / 'poster.pcraft')
        subprocess.run(args + source + chunk + ['--out', dest], check=True, stdout=subprocess.DEVNULL)
        shutil.copyfile(dest, project)


if __name__ == '__main__':
    poster()
    save_poster()
    cover.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(cli), 'convert', str(project), str(cover), '--quality', '88'], check=True)
