#!/usr/bin/env python3
"""Generates the two extra dynamic-music tracks (7 stems each) -> audio/stems2/*.mp3, audio/stems3/*.mp3
Needs: numpy, scipy, ffmpeg (libmp3lame).  Run from the game folder:  python3 tools/make_music.py
Stem names match music.js (base arp mel drm str war tns). Each stem is one seamless loop with 0.5s pre-roll + 0.5s tail."""
import numpy as np, subprocess, os, sys, wave
from scipy.signal import sosfilt, butter
SR = 44100
LEAD = 0.5
rng = np.random.default_rng(1337)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'audio')

# ---------- helpers ----------
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def lp(x, fc, o=2): return sosfilt(butter(o, min(fc, SR * .45), 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, fc, o=2): return sosfilt(butter(o, fc, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, a, b): return sosfilt(butter(2, [a, min(b, SR * .45)], 'band', fs=SR, output='sos'), x, axis=0)
def dist(x, d): return np.tanh(x * d) / np.tanh(d)
def crush(x, bits, down):
    y = np.repeat(x[::down], down)[:len(x)]; q = 2 ** (bits - 1); return np.round(y * q) / q
def osc(f, n, kind='saw'):
    f = np.full(n, f, float) if np.isscalar(f) else f
    ph = np.cumsum(f) / SR
    if kind == 'saw': return 2 * (ph % 1) - 1
    if kind == 'sq': return np.sign(np.sin(2 * np.pi * ph) + 1e-9)
    return np.sin(2 * np.pi * ph)
def tt(n): return np.arange(n) / SR
def fade_end(n, r): return np.minimum(1, (n - 1 - np.arange(n)) / max(1, r * SR))
def ad(n, a, tau, r=.01): t = tt(n); return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / tau) * fade_end(n, r)
def sus(n, a, r): t = tt(n); return np.minimum(1, t / max(a, 1e-4)) * fade_end(n, r)
def noise(n): return rng.normal(0, 1, n)
def pan(x, p):
    a = (p + 1) * np.pi / 4; return np.stack([x * np.cos(a), x * np.sin(a)], 1)
def put(buf, x, pos):
    N = len(buf); pos %= N
    if x.ndim == 1: x = pan(x, 0)
    n1 = min(len(x), N - pos); buf[pos:pos + n1] += x[:n1]
    if len(x) > n1: r = min(len(x) - n1, N); buf[:r] += x[n1:n1 + r]
def echo(buf, dt, fb, mix, taps=5):
    d = int(dt * SR); out = buf.copy()
    for k in range(1, taps + 1): out += mix * fb ** (k - 1) * np.roll(buf, k * d, axis=0)
    return out
def smear(buf, amt=.35):
    out = buf.copy()
    for i, ms in enumerate([29, 43, 67, 97, 131, 181, 251]):
        d = int(ms / 1000 * SR); g = amt * .75 ** i
        out[:, 0] += g * np.roll(buf[:, 0], d); out[:, 1] += g * np.roll(buf[:, 1], int(d * 1.13))
        out += g * .5 * np.roll(lp(buf, 2500), d * 2, axis=0)
    return out

# ---------- instruments ----------
def bass(f, n, drive=2.6):
    t = tt(n); fv = f * (1 + .003 * np.sin(2 * np.pi * .4 * t))
    x = .6 * osc(fv, n) + .4 * osc(fv * 1.006, n, 'sq')
    x = lp(x, 260) + .7 * lp(x, 1900) * np.exp(-t / .22)
    x = dist(x, drive) * .6 + .8 * osc(fv, n, 'sin')
    return x * sus(n, .008, .06)
def pluck(f, n):
    x = .5 * osc(f, n, 'sq') + .5 * osc(f * 1.011, n); x = lp(hp(x, 180), 3600)
    return crush(x, 6, 3) * ad(n, .002, .085)
def lead(f, n, prev=None, cut=2300):
    t = tt(n)
    pitch = f * np.ones(n)
    if prev is not None: pitch = f * 2 ** ((prev - 0) / 12 * np.exp(-t / .05)) if False else pitch
    vib = 1 + (.002 + .010 * np.clip(t - .25, 0, 1)) * np.sin(2 * np.pi * 5.2 * t) + .002 * np.sin(2 * np.pi * .7 * t)
    fv = pitch * vib
    x = osc(fv, n) + osc(fv * 1.013, n) + .5 * osc(fv * .5, n, 'sq')
    x = dist(lp(x, cut), 1.9) + .05 * lp(noise(n), 4000)
    return x * sus(n, .06, .18)
def kick(n=int(.42 * SR)):
    t = tt(n); ph = np.cumsum(46 + 95 * np.exp(-t / .028)) / SR
    x = np.sin(2 * np.pi * ph) * np.exp(-t / .2) + .35 * lp(noise(n), 3500) * np.exp(-t / .004)
    return dist(x, 3.2) * fade_end(n, .02)
def snare(n=int(.34 * SR)):
    t = tt(n); x = bp(noise(n), 220, 7000) * np.exp(-t / .10) + .7 * np.sin(2 * np.pi * 182 * t) * np.exp(-t / .06)
    return dist(crush(x, 7, 2), 2.4) * fade_end(n, .02)
def clank(f0, n=int(.55 * SR)):
    t = tt(n); x = sum(np.sin(2 * np.pi * f0 * r * t + k) * np.exp(-t / (.16 / (1 + .6 * k))) for k, r in enumerate([1, 2.76, 5.4, 8.93, 11.3]))
    x = x / 3 + .4 * bp(noise(n), 2500, 9000) * np.exp(-t / .03)
    return dist(x, 1.8) * fade_end(n, .03)
def hat(n=int(.1 * SR)):
    t = tt(n); return crush(hp(noise(n), 6500), 5, 2) * np.exp(-t / .028) * fade_end(n, .01)
def tom(f0, n=int(.5 * SR)):
    t = tt(n); ph = np.cumsum(f0 + f0 * .9 * np.exp(-t / .05)) / SR
    x = np.sin(2 * np.pi * ph) * np.exp(-t / .22) + .3 * lp(noise(n), 800) * np.exp(-t / .03)
    return dist(x, 2.2) * fade_end(n, .03)
def bow(f, n):
    t = tt(n); x = 0
    for k, d in enumerate((-.013, -.004, .005, .014)):
        fv = f * (1 + d) * (1 + .003 * np.sin(2 * np.pi * (5.1 + k * .37) * t + k))
        x = x + osc(fv, n)
    x = lp(x, 1500 + 900 * np.sin(2 * np.pi * .21 * t + 1)) if False else lp(x, 1700)
    x = x + .18 * lp(noise(n), 3500)
    return x * np.minimum(1, t / (n / SR * .45)) * fade_end(n, n / SR * .4)
def brassy(f, n):
    t = tt(n); x = osc(f, n) + .8 * osc(f * 1.007, n) + .6 * osc(f * .5, n, 'sq')
    x = dist(lp(x, 900) + .6 * lp(x, 2600) * np.exp(-t / .1), 4)
    return (x + .5 * lp(noise(n), 400) * np.exp(-t / .02)) * ad(n, .003, .15, .02)

# ---------- track specs ----------
TRACKS = {
 'stems2': dict(bpm=88, bars=16, tonic=38, roots=[0,0,1,0, 0,-2,1,0, 3,3,1,1, 0,-2,1,0],
   arp_iv=[0,7,12,15,19], arp_alt=13, arp_pat=[0,2,1,3,0,2,3,1, 0,2,1,3,2,3,1,2], arp_rest={5,13},
   bass_hits=[(0,6),(6,4),(10,6)], kick=[0,6,10], snare=[8], clank=[3,11,14], hat_gap={1,5,9,13}, war_hits=[0,3,6,8,11,14],
   mel_base=62, mel_ph={1:[(0,10,7),(10,6,8),(16,8,7),(24,4,5),(28,4,3)],2:[(0,12,3),(12,4,1),(16,10,0),(26,6,1)],
        3:[(0,6,12),(6,6,13),(12,4,12),(16,8,10),(24,8,7)],4:[(0,16,8),(16,8,7),(24,8,0)]}, mel_seq=[1,2,1,3,1,2,3,4], clank_f=310),
 'stems3': dict(bpm=132, bars=24, tonic=37, roots=[0,0,0,1, 0,0,3,1, 0,0,0,-1, 0,-2,1,0, 5,5,3,1, 0,0,1,0],
   arp_iv=[0,6,7,12,13,18], arp_alt=1, arp_pat=[0,1,2,1,3,2,4,3, 5,4,3,2,1,2,0,1], arp_rest={3,11},
   bass_hits=[(0,3),(3,3),(6,2),(8,3),(11,3),(14,2)], kick=[0,3,6,8,10,13], snare=[4,12], clank=[2,7,15], hat_gap={0,6,10}, war_hits=[0,2,3,6,8,10,11,14],
   mel_base=61, mel_ph={1:[(0,3,0),(3,3,1),(6,2,0),(8,3,6),(11,3,7),(14,2,6),(16,4,7),(20,4,6),(24,8,3)],
        2:[(0,3,12),(3,3,13),(6,2,12),(8,8,10),(16,3,7),(19,3,6),(22,2,7),(24,8,1)],3:[(0,8,7),(8,8,6),(16,8,3),(24,4,1),(28,4,0)],
        4:[(0,4,12),(4,4,13),(8,4,15),(12,4,13),(16,16,12)]}, mel_seq=[1,2,1,3,1,2,3,4,1,2,3,4], clank_f=420),
 'stems4': dict(kind='slow', seed=4, bpm=76, bars=16, tonic=33, roots=[0,0,1,1, 0,0,-2,1, 0,3,1,0, 0,-2,1,0],
   arp_iv=[0,3,7,12,15], arp_alt=13, arp_pat=[0,1,2,3,2,1,0,2, 1,3,2,4,3,2,1,0], arp_rest={4,12}, bass_hits=[(0,8),(8,6)], kick=[0,7,10], snare=[8], clank=[4,12,15],
   hat_gap={1,3,5,7,9,11,13}, war_hits=[0,6,8,14], mel_base=57, mel_ph={1:[(0,12,7),(12,4,8),(16,12,7),(28,4,5)],2:[(0,8,3),(8,8,5),(16,16,3)],
        3:[(0,6,12),(6,10,13),(16,8,12),(24,8,10)],4:[(0,24,0),(24,8,1)]}, mel_seq=[1,2,1,3,2,4,3,4], clank_f=260, bdrive=3.0, lead_cut=2000),
 'stems5': dict(kind='slow', seed=5, bpm=82, bars=16, tonic=35, roots=[0,0,0,-1, 0,1,0,-2, 3,3,1,0, 0,0,1,-1],
   arp_iv=[0,1,7,12,13,19], arp_alt=6, arp_pat=[0,2,1,3,5,3,1,2, 0,4,2,5,3,1,4,2], arp_rest={2,6,10}, bass_hits=[(0,4),(6,4),(10,6)], kick=[0,3,10], snare=[8], clank=[2,9,14],
   hat_gap={0,2,4,6,8,10,12,14}, war_hits=[0,3,8,11], mel_base=59, mel_ph={1:[(0,4,0),(4,4,1),(8,8,0),(16,6,-2),(22,10,0)],2:[(0,16,6),(16,8,7),(24,8,6)],
        3:[(0,8,12),(8,8,10),(16,8,13),(24,8,12)],4:[(0,12,3),(12,4,1),(16,16,0)]}, mel_seq=[1,2,1,4,3,2,3,4], clank_f=380, bdrive=2.2, lead_cut=2600),
 'stems6': dict(kind='slow', seed=6, bpm=68, bars=16, tonic=31, roots=[0,0,-2,-2, 1,1,0,0, 3,1,0,-2, 0,0,1,0],
   arp_iv=[0,5,7,12,17], arp_alt=13, arp_pat=[0,0,2,1,3,1,2,0, 4,2,3,1,2,0,1,3], arp_rest={1,3,9,11}, bass_hits=[(0,12)], kick=[0,10], snare=[12], clank=[6,14],
   hat_gap=set(range(16))-{0,8}, war_hits=[0,8,12], mel_base=55, mel_ph={1:[(0,16,7),(16,8,8),(24,8,7)],2:[(0,10,5),(10,6,3),(16,16,1)],
        3:[(0,8,10),(8,8,12),(16,12,10),(28,4,8)],4:[(0,32,0)]}, mel_seq=[1,2,1,2,3,2,3,4], clank_f=230, bdrive=3.4, lead_cut=1800),
 'stems7': dict(kind='fast', seed=7, bpm=144, bars=28, tonic=40, roots=[0,0,0,1, 0,0,-2,1, 0,0,3,1, 0,0,1,0, 5,5,3,1, 0,0,1,-1, 0,-2,1,0],
   arp_iv=[0,6,7,12,18,19], arp_alt=13, arp_pat=[0,2,4,2,1,3,5,3, 0,2,4,5,3,2,1,0], arp_rest={2,10}, bass_hits=[(i,2) for i in range(0,16,2)], kick=[0,4,8,10,12], snare=[4,12], clank=[2,6,14],
   hat_gap=set(), war_hits=list(range(0,16,2)), mel_base=64, mel_ph={1:[(0,2,0),(2,2,1),(4,2,0),(6,2,-2),(8,4,0),(12,2,1),(14,2,0),(16,8,3),(24,8,1)],
        2:[(0,3,12),(3,3,13),(6,2,12),(8,4,10),(12,4,7),(16,8,8),(24,8,7)],3:[(0,4,7),(4,4,6),(8,4,7),(12,4,10),(16,16,12)],4:[(0,8,15),(8,8,13),(16,8,12),(24,8,13)]},
   mel_seq=[1,2,1,3,1,2,3,4,1,2,1,3,4,4], clank_f=450, bdrive=3.2, lead_cut=2800),
 'stems8': dict(kind='fast', seed=8, bpm=156, bars=32, tonic=36, roots=[0,0,1,0, 0,3,1,0, 0,0,-2,1, 0,0,1,-1, 5,5,6,5, 3,3,1,1, 0,0,1,0, 0,-2,1,0],
   arp_iv=[0,1,6,7,12,13], arp_alt=18, arp_pat=[0,1,2,3,4,5,4,3, 2,1,0,2,4,3,5,1], arp_rest={7,15}, bass_hits=[(0,1),(1,1),(2,2),(4,1),(5,1),(6,2),(8,1),(9,1),(10,2),(12,1),(13,1),(14,2)],
   kick=[0,2,4,6,8,10,12,14], snare=[4,12], clank=[3,11,15], hat_gap={0,8}, war_hits=[0,1,2,4,5,6,8,9,10,12,13,14], mel_base=60,
   mel_ph={1:[(0,2,0),(2,2,0),(4,2,1),(6,2,0),(8,2,6),(10,2,7),(12,4,6),(16,8,3),(24,8,1)],2:[(0,4,12),(4,4,12),(8,4,13),(12,4,12),(16,8,10),(24,4,7),(28,4,6)],
        3:[(0,16,7),(16,8,6),(24,8,3)],4:[(0,2,15),(2,2,13),(4,2,12),(6,2,13),(8,8,15),(16,16,12)]}, mel_seq=[1,2,1,2,3,2,1,4,1,2,3,4,1,2,3,4], clank_f=520, bdrive=3.6, lead_cut=3000),
 'stems9': dict(kind='fast', seed=9, bpm=138, bars=24, tonic=43, roots=[0,0,1,0, 0,-2,1,0, 3,3,1,-1, 0,0,1,0, 5,3,1,1, 0,-2,1,0],
   arp_iv=[0,3,7,12,15,19], arp_alt=13, arp_pat=[0,3,1,4,2,5,3,1, 4,2,0,3,5,1,2,4], arp_rest={5,13}, bass_hits=[(0,4),(4,2),(6,2),(8,4),(12,4)], kick=[0,2,5,8,10,13], snare=[4,12],
   clank=[1,7,9], hat_gap={3,7,11,15}, war_hits=[0,2,5,8,10,13], mel_base=67,
   mel_ph={1:[(0,6,0),(6,2,1),(8,6,0),(14,2,-2),(16,8,3),(24,8,1)],2:[(0,3,7),(3,3,8),(6,2,7),(8,8,5),(16,4,3),(20,4,1),(24,8,0)],
        3:[(0,8,12),(8,4,13),(12,4,12),(16,8,15),(24,8,13)],4:[(0,16,10),(16,16,12)]}, mel_seq=[1,2,1,3,2,1,3,4,1,2,3,4], clank_f=400, bdrive=2.8, lead_cut=2400),
}

def build(spec):
    global rng
    rng = np.random.default_rng(spec.get('seed', 1337))
    step = int(round(SR * 60 / spec['bpm'] / 4)); bar = 16 * step; N = bar * spec['bars']; B = spec['bars']
    S = {k: np.zeros((N, 2)) for k in ('base', 'arp', 'mel', 'drm', 'str', 'war', 'tns')}
    ton = spec['tonic']; roots = spec['roots']
    # base: distorted drone-riff + rumble
    for b in range(B):
        f = mtof(ton + roots[b])
        for s, ln in spec['bass_hits']:
            n = int(ln * step * .95); put(S['base'], bass(f, n, spec.get('bdrive', 2.6)), b * bar + s * step)
    S['base'] += pan(lp(noise(N), 140) * .5, 0)
    # arp: gritty plucks, alternating pan, ping-pong echo
    for b in range(B):
        r = ton + 24 + roots[b]
        for s in range(16):
            if s % 8 in spec['arp_rest'] and b % 2 == 0: continue
            iv = spec['arp_iv'][spec['arp_pat'][s] % len(spec['arp_iv'])]
            if b % 4 == 3 and s % 8 == 6: iv = spec['arp_alt']
            n = int(step * 1.6); put(S['arp'], pluck(mtof(r + iv), n) * (1.0 if s % 4 == 0 else .7), b * bar + s * step + int(step * .0) ) if False else \
                put(S['arp'], pan(pluck(mtof(r + iv), n) * (1.0 if s % 4 == 0 else .7), -.5 if s % 2 else .5), b * bar + s * step)
    S['arp'] = echo(S['arp'], step * 3 / SR, .5, .45)
    # melody: sparse eerie lead, then smeared
    seq = spec['mel_seq']
    for i, ph in enumerate(seq):
        for s, ln, semi in spec['mel_ph'][ph]:
            n = int(ln * step * .97); put(S['mel'], lead(mtof(spec['mel_base'] + semi), n, cut=spec.get('lead_cut', 2300)), (i * 32 + s) * step)
    S['mel'] = smear(S['mel'], .4)
    # drums: kick / snare / clanks / hats
    K, Sn = kick(), snare()
    for b in range(B):
        o = b * bar; fill = (b % 4 == 3)
        for s in spec['kick']: put(S['drm'], K * (1 if s % 4 == 0 else .8), o + s * step)
        for s in spec['snare']: put(S['drm'], Sn, o + s * step)
        for s in spec['clank']:
            if b % 2 == 1 or s == spec['clank'][0]: put(S['drm'], clank(spec['clank_f'] * (1 + .12 * ((b + s) % 3))) * .5, o + s * step)
        for s in range(16):
            if s % 16 in spec['hat_gap'] and not fill: continue
            put(S['drm'], pan(hat() * (.6 if s % 2 else .9), -.3 if s % 2 else .3), o + s * step)
        if fill:
            for j, s in enumerate((12, 13, 14, 15)): put(S['drm'], Sn * (.5 + .15 * j), o + s * step)
    # strings: dissonant clusters, 2 bars each, with minor-second rubs
    for b in range(0, B, 2):
        r = ton + 12 + roots[b]; n = int(2 * bar * 1.04)
        for iv, p in ((0, -.4), (1, .4), (7, -.2), (8, .2), (15, 0)):
            put(S['str'], pan(bow(mtof(r + iv), n) * (.5 if iv in (1, 8) else .8), p), b * bar)
    S['str'] = smear(S['str'], .55)
    # war: heavy low staccato ostinato + tom fills
    for b in range(B):
        f = mtof(ton - 12 + roots[b]); o = b * bar
        for s in spec['war_hits']: put(S['war'], brassy(f, int(step * 1.5)) * (1 if s % 4 == 0 else .75), o + s * step)
        if b % 4 == 3:
            for j, s in enumerate((8, 10, 12, 13, 14, 15)): put(S['war'], tom(mtof(ton + 7 - (j % 3) * 2)) * .9, o + s * step)
        elif b % 2 == 1: put(S['war'], tom(mtof(ton)) * .8, o)
    # tension: screech pair (tritone/minor-2nd), rising sweeps, heartbeat, ticks, noise riser
    for b in range(0, B, 4):
        n = 4 * bar; t = tt(n); r = ton + 36 + roots[b]
        for iv, p in ((0, -.5), (6, .5), (1, 0)):
            f = mtof(r + iv) * 2 ** (np.linspace(0, 1, n) ** 2 * (1.0 / 12)) * (1 + .004 * np.sin(2 * np.pi * 6.1 * t))
            x = (osc(f, n, 'sin') + .35 * osc(f * 2, n, 'sin')) * np.minimum(1, t / (n / SR * .5)) * fade_end(n, n / SR * .3)
            put(S['tns'], pan(x * .3, p), b * bar)
        ramp = hp(noise(n), 3500) * np.linspace(0, 1, n) ** 3 * .35 * fade_end(n, .1); put(S['tns'], pan(ramp, 0), b * bar)
    for b in range(B):
        for beat in (0, 2):
            o = b * bar + beat * 4 * step
            put(S['tns'], pan(dist(np.sin(2 * np.pi * 52 * tt(int(.22 * SR))) * np.exp(-tt(int(.22 * SR)) / .07), 2) * .9, 0), o)
            put(S['tns'], pan(dist(np.sin(2 * np.pi * 47 * tt(int(.2 * SR))) * np.exp(-tt(int(.2 * SR)) / .06), 2) * .6, 0), o + int(.2 * SR))
        for s in rng.choice(16, 3, replace=False):
            n = int(.05 * SR); put(S['tns'], pan(crush(np.sin(2 * np.pi * rng.choice([2200, 3100, 4100]) * tt(n)), 4, 2) * np.exp(-tt(n) / .015) * .25, rng.uniform(-.9, .9)), b * bar + int(s) * step)
    S['tns'] = smear(S['tns'], .4)
    return S, N, step

REF = {'base': .164, 'arp': .016, 'mel': .062, 'drm': .025, 'str': .036, 'war': .057, 'tns': .072}
def ref_rms_from_files():
    """RMS of the original stems so the new ones sit at the same level."""
    out = {}
    for k in ('base', 'arp', 'mel', 'drm', 'str', 'war', 'tns'):
        p = os.path.join(OUT, 'stems', k + '.mp3')
        if not os.path.exists(p): out[k] = .08; continue
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
        a = np.frombuffer(raw, np.float32); out[k] = float(np.sqrt(np.mean(a ** 2))) or .08
    return out

def export(name, S, N, rms):
    d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True); L = int(LEAD * SR)
    for k, x in S.items():
        x = x - x.mean(axis=0)
        x = x * (rms[k] * (.8 if k == 'base' else 1.0) / (np.sqrt(np.mean(x ** 2)) + 1e-9))
        pk = np.abs(x).max(); x = np.tanh(x * (.9 / pk) * 1.1) * .95 if pk > .92 else x
        full = np.concatenate([x[-L:], x, x[:L]])
        stereo = k in ('base', 'arp', 'tns')
        if not stereo: full = np.repeat(full.mean(axis=1, keepdims=True), 2, 1)
        wv = os.path.join(d, k + '.wav')
        with wave.open(wv, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(full, -1, 1) * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wv, '-ac', '2' if stereo else '1', '-b:a', '112k' if stereo else '80k', os.path.join(d, k + '.mp3')], check=True)
        os.remove(wv)
    print(name, 'loop samples =', N, ' loop seconds =', N / SR, ' (MLOOP expr: %d/44100)' % N)

MIXW = {'slow': {'base': 1, 'arp': .8, 'mel': .7, 'drm': .8, 'str': .5, 'war': .4, 'tns': .3},
        'fast': {'base': 1, 'arp': .9, 'mel': .8, 'drm': 1, 'str': .6, 'war': .7, 'tns': .5}}
def export_mix(name, S, N, kind):
    """Full mix (2 loops) used when the page is opened from disk (file://) where the stems can't be loaded."""
    mix = sum(S[k] * w for k, w in MIXW[kind].items()); mix = mix - mix.mean(axis=0)
    mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) * .9; mix = np.concatenate([mix, mix])
    num = name.replace('stems', ''); wv = os.path.join(OUT, '_m.wav')
    with wave.open(wv, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wv, '-b:a', '160k', os.path.join(OUT, 'music' + num + '.mp3')], check=True); os.remove(wv)

if __name__ == '__main__':
    names = sys.argv[1:] or list(TRACKS)
    for name in names:
        S, N, step = build(TRACKS[name]); export(name, S, N, REF); export_mix(name, S, N, TRACKS[name].get('kind', 'slow'))
