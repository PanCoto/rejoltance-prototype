#!/usr/bin/env python3
"""RE:Joltance - renders the DYNAMIC version of "Ember Vigil": 7 loop-synced stems (one 53 s cycle) into audio/stems/*.mp3.
The game mixes them live: calm layers by round number, tense layers (strings, war drums, choir) as your hero health drops.
Warm pads, soft plucked arpeggios, a breathy flute melody and a muted heartbeat drum - calm, dark-fantasy, easy on the ears.
Usage: python3 tools/make_music_stems.py [out_dir]     (needs numpy + ffmpeg)"""
import sys, os, subprocess, wave, tempfile
import numpy as np

SR = 44100; BPM = 72; B = 60 / BPM
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'game', 'audio', 'stems')
mf = lambda m: 440 * 2 ** ((m - 69) / 12)

CHORDS = [
    ('Am', 45, [57, 60, 64, 69]), ('F', 41, [53, 57, 60, 65]), ('C', 48, [55, 60, 64, 67]), ('G', 43, [55, 59, 62, 67]),
    ('Am', 45, [57, 60, 64, 69]), ('F', 41, [53, 57, 60, 65]), ('Dm', 38, [53, 57, 62, 65]), ('E', 40, [52, 56, 59, 64])]
N = lambda s: {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[s[0]] + (1 if '#' in s else 0) + 12 * (int(s[-1]) + 1)
MELODY = [
    [('E5', 2), ('A5', 1.5), ('G5', .5), ('E5', 2), ('D5', 1), ('C5', 1)],
    [('C5', 2), ('F5', 1.5), ('E5', .5), ('C5', 2), ('A4', 2)],
    [('E5', 2), ('G5', 1.5), ('E5', .5), ('D5', 2), ('C5', 1), ('D5', 1)],
    [('D5', 2), ('B4', 1.5), ('D5', .5), ('G5', 2), ('D5', 2)],
    [('E5', 2), ('A5', 2), ('C6', 1.5), ('B5', .5), ('A5', 2)],
    [('A5', 2), ('C6', 1.5), ('A5', .5), ('F5', 2), ('F5', 2)],
    [('D5', 2), ('F5', 1.5), ('A5', .5), ('G5', 2), ('F5', 2)],
    [('B4', 2), ('G#4', 1.5), ('B4', .5), ('E5', 4)]]

TOTAL = 64 * B; NS = int(TOTAL * SR); PADN = 14 * SR
STEMS = ['base', 'arp', 'mel', 'drm', 'str', 'war', 'tns']
BUF = {k: [np.zeros(NS + PADN), np.zeros(NS + PADN)] for k in STEMS}
CUR = ['base']
rng = np.random.default_rng(7)

def fftfilt(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))
def put(x, start, pan=0.):
    s = int((start % TOTAL) * SR); a = np.cos((pan + 1) * np.pi / 4); b = np.sin((pan + 1) * np.pi / 4)
    Lb, Rb = BUF[CUR[0]]; Lb[s:s + len(x)] += x * a; Rb[s:s + len(x)] += x * b
def env(n, a, r):
    e = np.ones(n); na = max(1, min(n, int(a * SR))); nr = max(1, min(n, int(r * SR)))
    e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2; e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2; return e
def tt(d): return np.arange(int(d * SR)) / SR

def pad_note(f, d, vol):
    t = tt(d); det = 1.003
    x = np.sin(2 * np.pi * f * t) + .6 * np.sin(2 * np.pi * f * det * t) + .25 * np.sin(2 * np.pi * f * 2 * t) + .12 * np.sin(2 * np.pi * f * 3.01 * t)
    return x * env(len(t), 1.4, 1.6) * vol * (1 + .08 * np.sin(2 * np.pi * .13 * t))
def bass_note(f, d, vol):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 2 * f * t)) * env(len(t), .3, 1.2) * vol
def pluck(f, vol, d=1.6):
    t = tt(d); x = np.zeros(len(t))
    for m, w, k in [(1, 1, 2.6), (2, .45, 4), (3, .2, 6), (4.02, .08, 9)]: x += w * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k)
    x[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR)); return x * vol
def flute(f, d, vol):
    d += .25; t = tt(d); vib = np.clip((t - .25) / .6, 0, 1) * .005
    ph = 2 * np.pi * np.cumsum(f * (1 + vib * np.sin(2 * np.pi * 5.3 * t))) / SR
    x = np.sin(ph) + .22 * np.sin(2 * ph) + .07 * np.sin(3 * ph)
    br = fftfilt(rng.standard_normal(len(t)), f * 1.5, f * 5) * .09
    return (x + br) * env(len(t), .09, .3) * vol
def thump(vol, f0=95, f1=42):
    t = tt(.5); fr = f0 * (f1 / f0) ** (t / .5); x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 7)
    x[:int(.003 * SR)] *= np.linspace(0, 1, int(.003 * SR)); return x * vol
def shaker(vol):
    t = tt(.09); x = fftfilt(rng.standard_normal(len(t)), 5500, 11000) * np.exp(-t * 55); return x * vol


def saw_lp(f, d, vol, cut=1100, a=.01, k=9):
    t = tt(d); x = 2 * ((f * t) % 1) - 1; x = x + .6 * (2 * ((f * 1.004 * t) % 1) - 1)
    return fftfilt(x, 0, cut) * env(len(t), a, min(.12, d / 2)) * np.exp(-t * k) * vol
def choir(f, d, vol):
    t = tt(d); vib = 1 + .004 * np.sin(2 * np.pi * 5.1 * t + f)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    x = np.sin(ph) + .5 * np.sin(2 * ph) + .35 * np.sin(3 * ph) + .2 * np.sin(4 * ph) + .1 * np.sin(5 * ph)
    return fftfilt(x, 0, 2200) * env(len(t), 2.2, 1.8) * vol * (.75 + .25 * np.sin(2 * np.pi * .19 * t))
def tom(vol, f0=130, f1=62):
    t = tt(.45); fr = f0 * (f1 / f0) ** (t / .45); x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 9)
    x += fftfilt(rng.standard_normal(len(t)), 150, 1800) * np.exp(-t * 40) * .5
    x[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR)); return x * vol

for ci, (name, bass, vo) in enumerate(CHORDS):
    start = ci * 8 * B
    CUR[0] = 'base'
    for m in vo: put(pad_note(mf(m), 8 * B + 3, .075), start - 1.4, rng.uniform(-.5, .5))
    put(bass_note(mf(bass), 8 * B + .8, .34), start)
    CUR[0] = 'arp'
    pat = [0, 1, 2, 3, 2, 1, 2, 1]
    for k in range(16):
        m = vo[pat[k % 8] % 4] + 12
        put(pluck(mf(m), .05), start + k * .5 * B, -.6 if k % 2 == 0 else .6)
    CUR[0] = 'mel'; pos = 0
    for nt, bt in MELODY[ci]:
        put(flute(mf(N(nt)), bt * B * .96, .17), start + pos * B, .15); pos += bt
    CUR[0] = 'drm'
    for bar in range(2):
        put(thump(.55), start + bar * 4 * B); put(thump(.35, 85, 40), start + (bar * 4 + 2.5) * B)
    for k in range(16): put(shaker(.05 if k % 2 == 0 else .03), start + k * .5 * B, rng.uniform(-.3, .3))
    CUR[0] = 'str'
    r = mf(bass + 12); fifth = r * 1.5
    acc = [1, .55, .8, .55, 1, .55, .8, .9]
    for k in range(16):
        f = r if (k % 8) not in (3, 6) else fifth
        put(saw_lp(f, .26, .20 * acc[k % 8], 1000, .008, 7), start + k * .5 * B, -.15 + .3 * (k % 2))
    put(saw_lp(r / 2, 8 * B, .12, 700, 1.2, .0), start - .2)
    CUR[0] = 'war'
    for bar in range(2):
        b0 = start + bar * 4 * B
        for bt in range(4): put(tom(.85 if bt == 0 else .6), b0 + bt * B, -.1)
        put(tom(.45, 175, 85), b0 + 1.5 * B, .3); put(tom(.45, 160, 80), b0 + 3.5 * B, -.3)
    for k in range(8): put(tom(.18 + .05 * k, 150, 75), start + (7 + k * .125) * B, rng.uniform(-.3, .3))
    CUR[0] = 'tns'
    for m, v in [(vo[0] + 12, .10), (vo[2] + 12, .08), (vo[0] + 13, .055), (vo[1] + 24, .05)]:
        put(choir(mf(m), 8 * B + 2.5, v), start - 1.2, rng.uniform(-.7, .7))
    t = tt(8 * B + 1); trem = .5 + .5 * np.sin(2 * np.pi * 11 * t)
    vi = (np.sin(2 * np.pi * mf(vo[3] + 24) * t) + .4 * np.sin(2 * np.pi * mf(vo[3] + 24) * 2.003 * t)) * trem * env(len(t), 1.8, 1.8) * (.06 if ci % 2 else .04)
    put(vi, start - .3, .5)
CUR[0] = 'tns'; t = tt(4 * B); put(fftfilt(rng.standard_normal(len(t)), 500, 6000) * (t / t[-1]) ** 2.2 * .05, 60 * B)

def circ_reverb(x, seed, wet, tail=3.2):
    r = np.random.default_rng(seed); n = int(tail * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 1.9); ir = fftfilt(ir, 120, 5000); ir[:int(.02 * SR)] *= np.linspace(0, 1, int(.02 * SR))
    ir /= np.sqrt((ir ** 2).sum())
    y = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, len(x)), len(x))
    return x * (1 - wet * .4) + y * wet * 1.5
WET = dict(base=.34, arp=.34, mel=.34, drm=.22, str=.28, war=.30, tns=.40)
OUTB = {}
for k in STEMS:
    Lb, Rb = BUF[k]; Lb[:PADN] += Lb[NS:]; Rb[:PADN] += Rb[NS:]
    Lb = circ_reverb(Lb[:NS], 1, WET[k]); Rb = circ_reverb(Rb[:NS], 2, WET[k])
    OUTB[k] = [fftfilt(Lb, 35, 11000), fftfilt(Rb, 35, 11000)]
calm = [sum(OUTB[k][c] for k in ('base', 'arp', 'mel', 'drm')) for c in (0, 1)]
sc = .72 / max(np.abs(calm[0]).max(), np.abs(calm[1]).max())
os.makedirs(OUT, exist_ok=True)
LEAD = int(.5 * SR)
for k in STEMS:
    pair = np.stack([OUTB[k][0] * sc, OUTB[k][1] * sc], 1)
    ext = np.concatenate([pair[-LEAD:], pair, pair[:LEAD]])
    mono = k in ('mel', 'drm', 'str', 'war')
    if mono: ext = ext.mean(1, keepdims=True)
    with tempfile.TemporaryDirectory() as td:
        wp = os.path.join(td, 's.wav')
        pcm = (np.clip(ext, -1, 1) * 32767).astype('<i2')
        with wave.open(wp, 'wb') as w: w.setnchannels(ext.shape[1]); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wp, '-codec:a', 'libmp3lame', '-b:a', '80k' if mono else '112k', os.path.join(OUT, k + '.mp3')], check=True)
print(f'Wrote {len(STEMS)} stems to {os.path.abspath(OUT)}  (loop = {TOTAL:.4f} s, lead-in/out 0.5 s)')
