#!/usr/bin/env python3
"""RE:Joltance - generates all 51 sound effects (17 sounds x 3 variants) as smooth 16-bit mono WAV files.
Style: soft, warm, slightly dark-fantasy - sine/bell tones, airy filtered noise, a touch of room reverb. No harsh square waves.
Usage:  python3 tools/make_sfx.py            (writes into game/sfx/)
        python3 tools/make_sfx.py some/dir   (custom output folder)
Needs numpy (pip install numpy). Edit the recipes below to taste, then re-run."""
import sys, os, wave
import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'game', 'sfx')
os.makedirs(OUT, exist_ok=True)
PEAK = .55

def T(d): return np.arange(int(SR * d)) / SR
def sine(f, t): return np.sin(2 * np.pi * f * t)
def tri(f, t): return 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
def sweep(f0, f1, d):
    t = T(d); f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def adsr(n, a, r):
    e = np.ones(n); na = max(1, min(n, int(a * SR))); nr = max(1, min(n, int(r * SR)))
    e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e
def fftfilt(x, lo, hi):
    """smooth band-pass via FFT (lo=0 -> low-pass, hi=None -> high-pass)"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))
def noise(d, rng): return rng.standard_normal(int(SR * d)) * .5
def at(x, delay): return np.concatenate([np.zeros(int(SR * delay)), x])
def mix(*parts):
    n = max(len(p) for p in parts); o = np.zeros(n)
    for p in parts: o[:len(p)] += p
    return o
def bell(f, d=.9, vol=1, k=5):
    """glassy bell: a few partials, higher ones die faster"""
    t = T(d); o = np.zeros(len(t))
    for m, w, kk in [(1, 1, 1), (2.01, .35, 1.8), (2.76, .22, 2.4), (4.1, .1, 3.5)]:
        o += w * sine(f * m, t) * np.exp(-t * k * kk)
    return o * vol * adsr(len(t), .003, .05)
def pad(f, d, vol=1, a=.05, k=2.5):
    t = T(d)
    return (sine(f, t) + .3 * tri(f * 2, t) * .5 + .15 * sine(f * 3, t)) * np.exp(-t * k) * adsr(len(t), a, min(.2, d / 2)) * vol
def thump(f0, f1, d=.2, vol=1, k=16):
    t = T(d); return sweep(f0, f1, d) * np.exp(-t * k) * adsr(len(t), .004, .03) * vol
def air(d, rng, lo, hi, a=.02, r=.1, shape=None):
    x = fftfilt(noise(d, rng), lo, hi); x = x * adsr(len(x), a, r)
    return x * shape(T(d)) if shape else x
def reverb(x, rng, wet=.18, tail=.45):
    n = int(SR * tail); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 7); ir = fftfilt(ir, 0, 3500); ir[0] = 0
    ir /= np.sqrt((ir ** 2).sum()) + 1e-9
    y = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n), len(x) + n)
    x = np.concatenate([x, np.zeros(n)])
    return x * (1 - wet * .5) + y * wet * 1.6
def finish(x, rng, wet=.18, tail=.45):
    x = reverb(x, rng, wet, tail) if wet else x
    x = fftfilt(x, 40, 9500)
    x = np.tanh(x * 1.05)
    x = x / (np.max(np.abs(x)) or 1) * PEAK
    nz = np.nonzero(np.abs(x) > .002)[0]; x = x[:nz[-1] + 1] if len(nz) else x
    n = int(.012 * SR); x[:n] *= np.linspace(0, 1, n) ** 2; x[-n:] *= np.linspace(1, 0, n) ** 2
    return x

def attack(r, v):
    d = .3; sh = lambda t: np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    sw = air(d, r, 700 + v * 150, 5200, .06, .12, sh) * 1.6
    return mix(sw * .9, at(thump(150 - v * 12, 62, .2, .9, 14), .13)), .10, .25
def buff(r, v):
    base = [392, 440, 415][v]
    return mix(*[at(bell(f, .9, .5, 4.5), i * .08) for i, f in enumerate([base, base * 1.25, base * 1.5])]), .25, .6
def debuff(r, v):
    base = [392, 370, 349][v]
    return mix(at(pad(base, .6, .6, .02, 4), 0), at(pad(base * .84, .7, .6, .02, 4), .1), at(pad(base * .7, .8, .5, .02, 4), .2)), .22, .5
def burn(r, v):
    d = .75; t = T(d)
    body = air(d, r, 150, 900 + v * 150, .08, .45) * (1 + .5 * sine(7 + v * 1.5, t)) * 2
    cr = np.zeros(len(t))
    for _ in range(14):
        p = int(r.uniform(.05 * SR, len(t) - 700)); l = int(r.uniform(60, 260))
        cr[p:p + l] += fftfilt(r.standard_normal(l), 900, 4200) * np.linspace(1, 0, l) ** 2 * r.uniform(.2, .6)
    return mix(body, cr * 1.2), .12, .3
def cardDrawn(r, v):
    d = .17; sh = lambda t: np.sin(np.pi * np.clip(t / d, 0, 1))
    return air(d, r, 1400 + v * 300, 5000, .04, .08, sh) * 1.8 + 0, .06, .15
def damageTaken(r, v):
    return mix(thump(130 - v * 12, 52, .26, 1, 13), at(air(.12, r, 120, 1100, .004, .08) * 1.2, .005)), .12, .3
def defeat(r, v):
    fs = [(349, 311, 262, 233), (330, 294, 247, 220), (370, 330, 277, 247)][v]
    return mix(*[at(pad(f, 1.0, .6, .08, 2.2) + pad(f / 2, 1.0, .4, .08, 2.2), i * .38) for i, f in enumerate(fs)]), .3, .9
def endTurn(r, v):
    f = [440, 415, 392][v]
    return mix(bell(f, .6, .7, 7), at(bell(f * .75, .7, .6, 6), .1)), .2, .45
def heal(r, v):
    base = [330, 349, 370][v]
    chord = mix(pad(base, .9, .5, .12, 2), pad(base * 1.25, .9, .4, .12, 2), pad(base * 1.5, .9, .4, .12, 2))
    sp = mix(*[at(bell(base * m, .6, .22, 7), .1 + i * .09) for i, m in enumerate([3, 4, 5, 6])])
    return mix(chord, sp), .28, .7
def heroHit(r, v):
    return mix(thump(110 - v * 10, 36, .6, 1.2, 6), air(.35, r, 80, 1400, .004, .3) * 1.6 * np.exp(-T(.35) * 6), at(bell(165 + v * 15, .8, .12, 4), .02)), .25, .6
def mark(r, v):
    f = [1175, 1320, 1245][v]
    return mix(bell(f, .55, .6, 8), at(bell(f * 1.5, .45, .3, 10), .07)), .18, .4
def silence(r, v):
    d = .55; sh = lambda t: np.exp(-t * 3.5)
    x = air(d, r, 250, 2600 - v * 250, .05, .35, sh) * 2
    return mix(x, at(pad(220 - v * 12, .5, .35, .02, 5), .12)), .22, .5
def spellCast(r, v):
    d = .75; sh = lambda t: np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.3
    w = air(d, r, 500, 4200 + v * 500, .18, .4, sh) * 1.5
    rise = sweep(300 + v * 30, 880 + v * 60, .55) * adsr(int(.55 * SR), .12, .3) * .22
    sp = mix(*[at(bell(r.choice([1568, 1760, 2093, 2349, 2637]), .5, .22, 9), .15 + i * .08) for i in range(5)])
    return mix(w, rise, sp), .28, .7
def stun(r, v):
    t = T(.5); f = 330 + v * 25
    wob = np.sin(2 * np.pi * np.cumsum(f * (1 + .06 * sine(6 + v, t))) / SR) * np.exp(-t * 6) * adsr(len(t), .02, .1)
    return mix(thump(170, 80, .18, .9, 18), wob * .45, at(bell(f * 2, .4, .2, 8), .03)), .16, .4
def unitDeath(r, v):
    d = .85
    return mix(sweep(260 - v * 20, 70, .7) * np.exp(-T(.7) * 4.5) * adsr(int(.7 * SR), .01, .25) * .8,
               air(d, r, 200, 2200 - v * 250, .02, .6) * np.exp(-T(d) * 4) * 1.4, thump(100, 48, .3, .6, 10)), .25, .6
def unitPlayed(r, v):
    return mix(thump(210 - v * 15, 80, .17, 1, 20), air(.05, r, 400, 2400, .002, .04) * .5, at(bell(587 + v * 50, .5, .22, 8), .05)), .14, .3
def victory(r, v):
    base = [262, 294, 247][v]; seq = [1, 1.25, 1.5, 2]
    arp = mix(*[at(bell(base * m, 1.2, .55, 3), i * .16) for i, m in enumerate(seq)])
    ch = at(mix(*[pad(base * m, 1.4, .3, .1, 1.6) for m in (2, 2.5, 3)]), .5)
    return mix(arp, ch), .3, .9

SOUNDS = dict(attack=attack, buff=buff, burn=burn, cardDrawn=cardDrawn, damageTaken=damageTaken, debuff=debuff, defeat=defeat,
              endTurn=endTurn, heal=heal, heroHit=heroHit, mark=mark, silence=silence, spellCast=spellCast, stun=stun,
              unitDeath=unitDeath, unitPlayed=unitPlayed, victory=victory)

def write(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

if __name__ == '__main__':
    for name, fn in SOUNDS.items():
        for v in range(3):
            rng = np.random.default_rng(sum(map(ord, name)) * 10 + v)
            x, wet, tail = fn(rng, v)
            write(os.path.join(OUT, f'{name}_{v + 1}.wav'), finish(x, rng, wet, tail))
    print(f'Wrote {len(SOUNDS) * 3} files to {os.path.abspath(OUT)}')
