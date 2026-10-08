# Cuts clips captured by tests/tools/reel.ts into a 1080x1920 Short: beat-synced cuts, captions, a blurred
# backdrop and a "link in bio" end card, over one of the game's recordings. Two cuts: 'hype' (fast,
# the boss theme) and 'story' (the coma story, slower). Needs Pillow and ffmpeg.
#   npx tsx tests/tools/reel.ts test-output/reel && python3 tests/tools/reel_compose.py <hype|story> [out.mp4]
import os, sys, subprocess, math, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REEL = os.environ.get('REEL_DIR', os.path.join(REPO, 'test-output', 'reel'))
FONT_B = REPO + '/node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-900-normal.woff'
FONT_M = REPO + '/node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff'
FONT_G = REPO + '/node_modules/@fontsource/pirata-one/files/pirata-one-latin-400-normal.woff'
FPS = 30
W, H = 1080, 1920
SQ_Y = 330              # top of the gameplay square
GOLD, YEL, WHITE = (232, 192, 96), (255, 216, 74), (255, 255, 255)
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
CUT = ARGS[0] if ARGS else 'hype'
OUT = ARGS[1] if len(ARGS) > 1 else os.path.join(REPO, 'test-output', f'lost_marcus_{CUT}.mp4')
PREVIEW = '--preview' in sys.argv

def frames_of(d): return sorted(glob.glob(os.path.join(REEL, d, '*.jpg')))

def busiest(d, n, lo=0, hi=None):
    """Start index of the n-frame window with the most going on (bigger JPEGs = more detail on screen)."""
    fs = frames_of(d); hi = len(fs) if hi is None else min(hi, len(fs))
    sz = [os.path.getsize(f) for f in fs]
    best, bi = -1, lo
    for i in range(lo, max(lo + 1, hi - n + 1)):
        v = sum(sz[i:i + n])
        if v > best: best, bi = v, i
    return bi

# Each cut: the music (a recording, its beat length and a downbeat to start on, so cuts land on beats),
# the end card's line, and a timeline of (clip dir, beats, start frame or None for the busiest stretch,
# caption lines [(text, colour)], options).
CUTS = {
    # fast and loud: "Ink and Iron", 88 BPM, starting where the full band comes in
    'hype': dict(music='31-boss.ogg', beat=60 / 88, start=0.296 + 8 * 60 / 88,
        tagline=[('A ROGUELIKE ABOUT THE NIGHT', WHITE), ('HE NEVER GOT TO SAY GOODBYE', WHITE)],
        timeline=[
            ('final/fight', 4, 0, [('I MADE A ROGUELIKE', WHITE), ('THAT GETS THIS INSANE', YEL)], {}),
            ('cellar2', 3, None, [('NO ROOM', WHITE), ('IS SAFE', YEL)], {}),
            ('fan', 3, None, [('200+ ITEMS', YEL)], {}),
            ('boom', 3, None, [('THAT ALL', WHITE), ('STACK', YEL)], {}),
            ('beam', 3, None, [('CHARGE', WHITE), ('BEAMS', YEL)], {}),
            ('melee', 3, None, [('SWING', WHITE), ('BLADES', YEL)], {}),
            ('swarm', 3, None, [('RAISE AN', WHITE), ('ARMY', YEL)], {}),
            ('boiler2', 3, None, [('57 MONSTERS', YEL)], {}),
            ('ward2', 3, None, [('EACH WITH', WHITE), ('A DIRTY TRICK', YEL)], {}),
            ('boss/card', 4, 16, [('26 BOSSES', YEL)], {}),
            ('boss/fight', 3, None, [('BUILT TO', WHITE), ('BREAK YOU', YEL)], {}),
            ('surgeon/card', 4, 16, [('ALL THE WAY DOWN', WHITE), ('TO THE DEEP END', YEL)], {}),
            ('surgeon/fight', 3, None, [('CAN YOU', WHITE), ('WAKE HIM UP?', YEL)], {}),
            ('END', 8, None, [], {}),
        ]),
    # the story: "Four Minutes Past Four", 85 BPM, from the top
    'story': dict(music='20-clocktower.ogg', beat=60 / 85, start=0.308,
        tagline=[('FIVE ENDINGS.', WHITE), ('ONE OF THEM WAKES HIM UP.', WHITE)],
        timeline=[
            ('intro', 5, 10, [('4:04 AM.', WHITE), ('HE DROVE INTO THE RIVER', YEL)], {}),
            ('final/card', 4, 18, [('TWO FLOORS UP,', WHITE), ('HIS GRANDAD DIED', YEL)], {}),
            ('cellar2', 5, None, [('NOW HE\'S IN A COMA', WHITE), ('AND IT\'S A NIGHTMARE', YEL)], {}),
            ('boiler2', 4, None, [('THE STAIRS', WHITE), ('ONLY GO DOWN', YEL)], {}),
            ('under2', 4, None, [('EVERY FLOOR IS', WHITE), ('SOMETHING HE BURIED', YEL)], {}),
            ('ward2', 4, None, [('THE WARD', WHITE), ('HE NEVER VISITED', YEL)], {}),
            ('surgeon/card', 5, 16, [('AT THE BOTTOM', WHITE), ('SOMETHING IS WAITING', YEL)], {}),
            ('surgeon/fight', 4, None, [('HE HAS TO', WHITE), ('FIGHT HIS WAY OUT', YEL)], {}),
            ('final/fight', 5, 30, [('SOMEONE UPSTAIRS', WHITE), ('IS HOLDING HIS HAND', YEL)], {}),
            ('END', 8, None, [], {}),
        ]),
}
C = CUTS[CUT]
MUSIC = REPO + '/assets/music/audio/' + C['music']
BEAT = C['beat']
MUSIC_START = C['start']
TIMELINE = C['timeline']

def font(path, size): return ImageFont.truetype(path, size)

def text_img(lines, size=124):
    """Caption block: heavy condensed caps, thick black outline, a soft drop shadow."""
    f = font(FONT_B, size)
    rows = []
    for t, c in lines:
        bb = f.getbbox(t, stroke_width=10)
        rows.append((t, c, bb))
    wmax = max(bb[2] - bb[0] for _, _, bb in rows) + 40
    lh = int(size * 1.02)
    img = Image.new('RGBA', (wmax, lh * len(rows) + 40), (0, 0, 0, 0))
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d, ds = ImageDraw.Draw(img), ImageDraw.Draw(sh)
    for i, (t, c, bb) in enumerate(rows):
        x = (wmax - (bb[2] - bb[0])) // 2 - bb[0]; y = 14 + i * lh - bb[1] // 2
        ds.text((x + 6, y + 9), t, font=f, fill=(0, 0, 0, 200), stroke_width=10, stroke_fill=(0, 0, 0, 200))
        d.text((x, y), t, font=f, fill=c, stroke_width=10, stroke_fill=(12, 6, 14))
    sh = sh.filter(ImageFilter.GaussianBlur(8))
    sh.alpha_composite(img)
    # fit inside the safe area above the gameplay
    k = min(1, 1000 / sh.width, 290 / sh.height)
    if k < 1: sh = sh.resize((int(sh.width * k), int(sh.height * k)), Image.LANCZOS)
    return sh

def ease_out_back(t):
    c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2

def backdrop(sq):
    """The gameplay itself, blurred and dimmed, filling the frame behind the square."""
    small = sq.resize((108, 108), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4))
    big = small.resize((1920, 1920), Image.BILINEAR).crop(((1920 - W) // 2, 0, (1920 - W) // 2 + W, H))
    return ImageEnhance.Brightness(big).enhance(0.38)

BRAND = None
def brand_strip():
    """Under the gameplay: the game's name and the call to action, there the whole time."""
    global BRAND
    if BRAND: return BRAND
    img = Image.new('RGBA', (W, 220), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    g = font(FONT_G, 96); t = 'Lost Marcus'
    bb = g.getbbox(t); x = (W - (bb[2] - bb[0])) // 2 - bb[0]
    d.text((x, 6), t, font=g, fill=GOLD, stroke_width=5, stroke_fill=(20, 10, 14))
    f = font(FONT_M, 46); t2 = 'FREE TO PLAY  •  LINK IN BIO'
    bb = f.getbbox(t2); tw = bb[2] - bb[0]; px = (W - tw) // 2
    d.rounded_rectangle((px - 34, 124, px + tw + 34, 192), radius=34, fill=(255, 216, 74, 235))
    d.text((px - bb[0], 132 - bb[1] + 4), t2, font=f, fill=(24, 12, 16))
    BRAND = img
    return img

def end_card(bg_sq, k, n):
    """Last beat: the title, FREE, and a bouncing arrow at the link."""
    t = k / FPS
    frame = backdrop(bg_sq).convert('RGBA')
    over = Image.new('RGBA', (W, H), (8, 4, 10, 120)); frame.alpha_composite(over)
    d = ImageDraw.Draw(frame)
    # title slams in
    a = min(1, t / 0.35); sc = 1 + (1 - ease_out_back(a)) * 0.6 if a < 1 else 1
    g = font(FONT_G, int(210 * sc))
    for i, word in enumerate(['Lost', 'Marcus']):
        bb = g.getbbox(word); x = (W - (bb[2] - bb[0])) // 2 - bb[0]
        d.text((x, 360 + i * 200 - bb[1]), word, font=g, fill=GOLD, stroke_width=8, stroke_fill=(20, 8, 12))
    if t > 0.45:
        sub = text_img(C['tagline'], 62)
        frame.alpha_composite(sub, ((W - sub.width) // 2, 820))
    if t > 0.9:
        a2 = min(1, (t - 0.9) / 0.25); s2 = 1 + (1 - ease_out_back(a2)) * 0.5
        f = font(FONT_B, int(150 * s2)); txt = 'PLAY IT FREE'
        bb = f.getbbox(txt, stroke_width=10); x = (W - (bb[2] - bb[0])) // 2 - bb[0]
        d.text((x, 1030 - bb[1]), txt, font=f, fill=WHITE, stroke_width=10, stroke_fill=(12, 6, 14))
    if t > 1.3:
        f = font(FONT_B, 104); txt = 'LINK IN BIO'
        bb = f.getbbox(txt); tw = bb[2] - bb[0]; px = (W - tw) // 2
        pulse = 1 + 0.04 * math.sin(t * 2 * math.pi / BEAT)
        bw, bh = (tw + 110) * pulse, 150 * pulse; cx, cy = W / 2, 1290
        d.rounded_rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2), radius=int(bh / 2), fill=YEL, outline=(20, 8, 12), width=6)
        d.text((px - bb[0], cy - (bb[3] + bb[1]) / 2), txt, font=f, fill=(24, 12, 16))
        # the arrow bounces on the beat, pointing at the bio
        by = 1420 + abs(math.sin(t * math.pi / BEAT)) * 36
        for dx in (0,):
            d.polygon([(W / 2 - 60, by), (W / 2 + 60, by), (W / 2, by + 70)], fill=WHITE, outline=(20, 8, 12))
    if t > 1.6:
        f = font(FONT_M, 50); txt = 'Windows  •  any browser'
        bb = f.getbbox(txt); d.text(((W - (bb[2] - bb[0])) // 2 - bb[0], 1540), txt, font=f, fill=(230, 220, 205), stroke_width=4, stroke_fill=(12, 6, 14))
    return frame.convert('RGB')

def main():
    # resolve segment frame lists, cut lengths snapped to the beat grid
    segs, t_acc, used = [], 0.0, {}
    for d, beats, start, cap, opt in TIMELINE:
        t_end = t_acc + beats * BEAT
        n = round(t_end * FPS) - round(t_acc * FPS)
        if d == 'END': segs.append((d, [], cap, n)); t_acc = t_end; continue
        fs = frames_of(d)
        if not fs: raise SystemExit('no frames in ' + d)
        if start is None: st = busiest(d, n); used[d] = (st, n)
        elif start == 'second':
            # the busiest stretch that doesn't repeat what the hook already showed
            u0, un = used.get(d, (0, 0)); a = busiest(d, n, u0 + un); b = busiest(d, n, 0, u0)
            sz = lambda i: sum(os.path.getsize(f) for f in fs[i:i + n])
            st = a if (u0 + un + n > len(fs)) is False and (u0 < n or sz(a) >= sz(b)) else b
        elif start == 'end': st = max(0, len(fs) - n)
        else: st = start
        sel = [fs[min(len(fs) - 1, st + i)] for i in range(n)]
        segs.append((d, sel, cap, n)); t_acc = t_end
    total = sum(s[3] for s in segs)
    dur = total / FPS
    print('segments:', [(s[0], s[3]) for s in segs], 'total %.2fs' % dur)
    if PREVIEW:
        return segs
    enc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-ss', str(MUSIC_START), '-t', '%.3f' % dur, '-i', MUSIC,
        '-filter_complex', '[1:a]afade=t=in:d=0.05,afade=t=out:st=%.3f:d=1.4,loudnorm=I=-14:TP=-1.5:LRA=11[a]' % (dur - 1.4),
        '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', OUT], stdin=subprocess.PIPE)
    brand = brand_strip()
    last_sq = None
    for si, (d, sel, cap, n) in enumerate(segs):
        cimg = text_img(cap) if cap else None
        for k in range(n):
            if d == 'END':
                enc.stdin.write(end_card(last_sq, k, n).tobytes()); continue
            sq = Image.open(sel[k]).convert('RGB'); last_sq = sq
            # zoom punch on the cut
            if k < 7:
                z = 1 + 0.07 * (1 - k / 7) ** 2; c = int(1080 / z); o = (1080 - c) // 2
                sq = sq.crop((o, o, o + c, o + c)).resize((1080, 1080), Image.BICUBIC)
            frame = backdrop(sq)
            frame.paste(sq, (0, SQ_Y))
            fr = frame.convert('RGBA')
            dr = ImageDraw.Draw(fr)
            dr.rectangle((0, SQ_Y - 6, W, SQ_Y - 1), fill=GOLD + (255,)); dr.rectangle((0, SQ_Y + 1080, W, SQ_Y + 1085), fill=GOLD + (255,))
            # white flash on the cut
            if k < 3 and si > 0:
                fr.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(150 * (1 - k / 3)))))
            if cimg is not None:
                a = min(1, k / 6); s = 0.6 + 0.4 * ease_out_back(a) if a < 1 else 1
                ci = cimg if s == 1 else cimg.resize((max(1, int(cimg.width * s)), max(1, int(cimg.height * s))), Image.BICUBIC)
                cy = 185 - ci.height // 2 + (20 if len(cap) == 1 else 0)
                fr.alpha_composite(ci, ((W - ci.width) // 2, max(0, cy)))
            fr.alpha_composite(brand, (0, SQ_Y + 1100))
            enc.stdin.write(fr.convert('RGB').tobytes())
        print('done', d, flush=True)
    enc.stdin.close(); enc.wait()
    print('wrote', OUT, 'exit', enc.returncode)

if __name__ == '__main__':
    main()
