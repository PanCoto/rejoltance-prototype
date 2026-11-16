#!/usr/bin/env python3
"""Generates the main-menu theme -> audio/menu.mp3
Re-uses the synth instruments / stem builder from make_music.py, so it sounds like the in-game music
(gritty plucks, distorted bass, eerie lead, bowed pads) but with a slow, atmospheric arrangement.
Needs: numpy, scipy, ffmpeg (libmp3lame).  Run from the game folder:  python3 tools/make_menu_music.py
Output is one seamless loop with 0.5s pre-roll + 0.5s tail (LEAD), same convention as music.js (see menumusic.js)."""
import os, sys, wave, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_music as mm

SR, LEAD = mm.SR, mm.LEAD
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio')

SPEC = dict(seed=21, bpm=78, bars=32, tonic=33,
  roots=[0,0,1,1, 0,0,-2,1, 0,3,1,0, 0,-2,1,0,   0,0,1,1, 3,3,1,1, 5,5,3,1, 0,-2,1,0],
  arp_iv=[0,3,7,12,15], arp_alt=13, arp_pat=[0,1,2,3,2,1,0,2, 1,3,2,4,3,2,1,0], arp_rest={4,12},
  bass_hits=[(0,8),(8,6)], kick=[0,7,10], snare=[8], clank=[4,12,15],
  hat_gap={1,3,5,7,9,11,13}, war_hits=[0,6,8,14],
  mel_base=57,
  mel_ph={1:[(0,6,12),(6,2,13),(8,8,12),(16,8,7),(24,8,8)],
          2:[(0,8,7),(8,4,8),(12,4,7),(16,8,3),(24,8,5)],
          3:[(0,4,12),(4,4,10),(8,8,7),(16,12,8),(28,4,7)],
          4:[(0,16,3),(16,16,0)]},
  mel_seq=[1,2,1,3, 1,2,3,4, 1,2,1,3, 2,3,4,4],
  clank_f=300, bdrive=2.8, lead_cut=2100)

# per-bar level of every stem (32 bars, circular -> intro/outro are quiet so the loop point is invisible)
def L(spans, B=32, default=0.0):
    a = np.full(B, default, float)
    for lo, hi, v in spans: a[lo:hi] = v
    return a
LEVELS = {
  'base': L([(0, 2, .75), (2, 28, 1.0), (28, 30, .85), (30, 32, .75)]),
  'str':  L([(0, 12, .7), (12, 20, 1.0), (20, 32, .7)]),
  'arp':  L([(2, 4, .5), (4, 14, 1.0), (14, 16, .4), (16, 28, 1.0), (28, 30, .5), (30, 32, .25)]),
  'mel':  L([(8, 16, .9), (16, 24, 1.0), (24, 28, .8)]),
  'drm':  L([(8, 12, .45), (12, 28, .7)]),
  'war':  L([(20, 24, .35)]),
  'tns':  L([(12, 16, .3)]),
}
WEIGHT = {'base': 1, 'arp': .8, 'mel': .75, 'drm': .6, 'str': .6, 'war': .8, 'tns': .6}

def bar_env(levels, nbar, spb):
    """smooth circular interpolation of per-bar levels to samples (levels sit in the middle of each bar)"""
    B = len(levels); N = B * spb
    xs = (np.arange(-1, B + 1) + .5) * spb
    ys = np.concatenate([[levels[-1]], levels, [levels[0]]])
    return np.interp(np.arange(N), xs, ys)

def main():
    S, N, step = mm.build(SPEC)
    spb = 16 * step
    mix = np.zeros((N, 2))
    for k, x in S.items():
        x = x - x.mean(axis=0)
        x = x * (mm.REF[k] * (.8 if k == 'base' else 1.0) / (np.sqrt(np.mean(x ** 2)) + 1e-9))   # same relative levels as the game stems
        mix += x * WEIGHT[k] * bar_env(LEVELS[k], SPEC['bars'], spb)[:, None]
    mix -= mix.mean(axis=0)
    mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) * .85
    full = np.concatenate([mix[-int(LEAD * SR):], mix, mix[:int(LEAD * SR)]])
    os.makedirs(OUT, exist_ok=True)
    wv = os.path.join(OUT, '_menu.wav')
    with wave.open(wv, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(full, -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wv, '-b:a', '160k', os.path.join(OUT, 'menu.mp3')], check=True)
    os.remove(wv)
    print('menu loop samples =', N, ' loop seconds =', N / SR, ' (menumusic.js: MENU_LOOP = %d/44100)' % N)

if __name__ == '__main__':
    main()
