#!/usr/bin/env python3
"""RE:Joltance - composes the in-game theme "Ember Vigil" (A minor, 72 BPM, ~1:47, seamless loop) and writes audio/music.mp3.
Warm pads, soft plucked arpeggios, a breathy flute melody and a muted heartbeat drum - calm, dark-fantasy, easy on the ears.
Usage: python3 tools/make_music.py [out.mp3]     (needs numpy + ffmpeg)   Edit CHORDS / MELODY / BPM below and re-run."""
import sys, os, subprocess, wave, tempfile
import numpy as np

SR = 44100; BPM = 72; B = 60 / BPM
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'game', 'audio', 'music.mp3')
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

TOTAL = 128 * B; NS = int(TOTAL * SR); PADN = 14 * SR
L = np.zeros(NS + PADN); R = np.zeros(NS + PADN)
rng = np.random.default_rng(7)

def fftfilt(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))
def put(x, start, pan=0.):
    s = int((start % TOTAL) * SR); a = np.cos((pan + 1) * np.pi / 4); b = np.sin((pan + 1) * np.pi / 4)
    L[s:s + len(x)] += x * a; R[s:s + len(x)] += x * b
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

for ci, (name, bass, vo) in enumerate(CHORDS * 2):
    cyc = ci // 8; start = ci * 8 * B; full = cyc == 1; first_half = (ci % 8) < 4
    for m in vo: put(pad_note(mf(m), 8 * B + 3, .075), start - 1.4, rng.uniform(-.5, .5))
    put(bass_note(mf(bass), 8 * B + .8, .34), start)
    if not (cyc == 0 and ci < 2):
        pat = [0, 1, 2, 3, 2, 1, 2, 1] if full else [0, 2, 1, 3]
        step = .5 if full else 1.0
        for k in range(int(8 / step)):
            idx = pat[k % len(pat)]; m = vo[idx % 4] + 12
            put(pluck(mf(m), .05 if full else .035), start + k * step * B, -.6 if k % 2 == 0 else .6)
    if full or not first_half:
        pos = 0
        for nt, bt in MELODY[ci % 8]:
            put(flute(mf(N(nt)), bt * B * .96, .17 if full else .11), start + pos * B, .15); pos += bt
    if full:
        for bar in range(4):
            put(thump(.55), start + bar * 4 * B); put(thump(.35, 85, 40), start + (bar * 4 + 2.5) * B)
        for k in range(16): put(shaker(.05 if k % 2 == 0 else .03), start + k * .5 * B, rng.uniform(-.3, .3))
    elif not first_half:
        put(thump(.4), start); put(thump(.4), start + 4 * B)
t = tt(4 * B); sw = fftfilt(rng.standard_normal(len(t)), 600, 5000) * (t / t[-1]) ** 2.2 * .05
put(sw, 60 * B)
put(sw, 124 * B)

L[:PADN] += L[NS:]; R[:PADN] += R[NS:]; L = L[:NS]; R = R[:NS]

def circ_reverb(x, seed, wet=.34, tail=3.2):
    r = np.random.default_rng(seed); n = int(tail * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 1.9); ir = fftfilt(ir, 120, 5000); ir[:int(.02 * SR)] *= np.linspace(0, 1, int(.02 * SR))
    ir /= np.sqrt((ir ** 2).sum())
    y = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, len(x)), len(x))
    return x * (1 - wet * .4) + y * wet * 1.5
L = circ_reverb(L, 1); R = circ_reverb(R, 2)
L = fftfilt(L, 35, 11000); R = fftfilt(R, 35, 11000)
pk = max(np.abs(L).max(), np.abs(R).max()); L, R = L / pk * .72, R / pk * .72

with tempfile.TemporaryDirectory() as td:
    wp = os.path.join(td, 'm.wav')
    pcm = (np.clip(np.stack([L, R], 1), -1, 1) * 32767).astype('<i2')
    with wave.open(wp, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wp, '-codec:a', 'libmp3lame', '-b:a', '160k', OUT], check=True)
print('Wrote', os.path.abspath(OUT), f'({TOTAL:.1f}s loop)')
