#!/usr/bin/env python3
"""Renders the 'twins' that pair every slow track with a fast one -> audio/stemsNf|s/*.mp3 + audio/musicNf|s.mp3 (file:// fallback mix).
  slow track  stems2/4/5/6  ->  fast twin  stems2f/4f/5f/6f   (faster, driving bass, busier drums, brighter lead)
  fast track  stems3/7/8/9  ->  slow twin  stems3s/7s/8s/9s   (slower, longer bass notes, half-time drums, sparse hats, darker lead)
A twin keeps its partner's key, chord progression, bar count, arpeggio and melody and only changes the arrangement, so music.js can
swing between the two on a bar line and it still sounds like the same piece. No 'str' stem is rendered (it was dropped from the game).
Needs numpy, scipy, ffmpeg.  Run from the game folder:  python3 tools/make_music_twins.py [stems2 stems3s ...]"""
import os, sys, subprocess, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_music as M

SLOW = ['stems2', 'stems4', 'stems5', 'stems6']      # -> fast twins (suffix f)
FAST = ['stems3', 'stems7', 'stems8', 'stems9']      # -> slow twins (suffix s)
SPEEDUP = 1.32
SLOWDOWN = 1.6

def fast_spec(base):
    s = dict(base)
    s['kind'] = 'fast'
    s['bpm'] = int(round(base['bpm'] * SPEEDUP))
    s['bass_hits'] = [(i, 2) for i in range(0, 16, 2)]                       # driving eighths
    s['kick'] = sorted(set(base['kick']) | {0, 4, 8, 12})                     # steady pulse under the old pattern
    s['snare'] = [4, 12]                                                      # backbeat instead of half-time
    s['hat_gap'] = set()                                                      # unbroken 16th hats
    s['war_hits'] = sorted(set(base['war_hits']) | set(range(0, 16, 2)))
    s['clank_f'] = int(base.get('clank_f', 350) * 1.35)
    s['bdrive'] = base.get('bdrive', 2.6) + .6
    s['lead_cut'] = base.get('lead_cut', 2300) + 700
    return s

def slow_spec(base):
    s = dict(base)
    s['kind'] = 'slow'
    s['bpm'] = int(round(base['bpm'] / SLOWDOWN))
    s['bass_hits'] = [(0, 8), (8, 6)]                                         # long, heavy notes instead of a driving riff
    s['kick'] = [0, 10]
    s['snare'] = [8]                                                          # half-time
    s['hat_gap'] = {1, 3, 5, 7, 9, 11, 13, 15}                                # eighth-note hats only
    s['arp_rest'] = set(base['arp_rest']) | {2, 6}                            # more air in the arpeggio
    s['war_hits'] = [0, 8, 12]
    s['clank_f'] = int(base.get('clank_f', 400) * .7)
    s['bdrive'] = max(2.0, base.get('bdrive', 2.6) - .6)
    s['lead_cut'] = max(1700, base.get('lead_cut', 2300) - 600)
    return s

def rms_of(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(M.SR), '-'], capture_output=True, check=True).stdout
    return float(np.sqrt(np.mean(np.frombuffer(raw, dtype='<f4') ** 2)))

def run(name):
    to_fast = name in SLOW
    spec = (fast_spec if to_fast else slow_spec)(M.TRACKS[name])
    S, N, step = M.build(spec)
    S.pop('str')
    out = name + ('f' if to_fast else 's')
    M.export(out, S, N, M.REF)
    # fallback mix (2 loops): same recipe as the generator's mixer, minus str, then matched to its partner's level
    w = M.MIXW[spec['kind']]; mix = sum(S[k] * w[k] for k in S); mix = mix - mix.mean(axis=0)
    mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) * .9
    tgt = .2
    partner = os.path.join(M.OUT, 'music' + name.replace('stems', '') + '.mp3')
    if os.path.exists(partner):    # fast twins land ~10% louder than their slow partner, slow twins ~10% quieter than their fast one
        tgt = float(np.clip(rms_of(partner) * (1.1 if to_fast else 1 / 1.1), .12, .22))
    g = min(tgt / np.sqrt(np.mean(mix ** 2)), .95 / np.abs(mix).max()); mix = np.concatenate([mix * g, mix * g])
    wv = os.path.join(M.OUT, '_m.wav')
    with wave.open(wv, 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(M.SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wv, '-b:a', '160k', os.path.join(M.OUT, 'music' + out.replace('stems', '') + '.mp3')], check=True)
    os.remove(wv)
    print(name, '->', out, 'bpm', spec['bpm'], 'loop', N, 'bars', spec['bars'])

if __name__ == '__main__':
    for n in (sys.argv[1:] or SLOW + FAST): run(n)
