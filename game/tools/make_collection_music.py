#!/usr/bin/env python3
"""Generates the Collection / Deck-builder theme -> audio/collection.mp3
Same synth palette as the game music (make_music.py) but a calmer, 'thinking' arrangement: steady mid-tempo pulse,
bright minor-pentatonic arpeggios doing most of the work, a restrained lead, soft ticking percussion, no war / tension stems.
Needs: numpy, scipy, ffmpeg.  Run from the game folder:  python3 tools/make_collection_music.py"""
import os, sys, wave, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_music as mm
from make_menu_music import L, bar_env

SR, LEAD = mm.SR, mm.LEAD
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio')

SPEC = dict(seed=77, bpm=94, bars=32, tonic=38,   # D minor, 94 bpm
  roots=[0,0,-2,-2, 3,3,-2,0,  0,0,-2,-2, 5,3,1,0,   0,0,3,3, -2,-2,0,0,  5,5,3,3, 1,-2,0,0],
  arp_iv=[0,3,7,10,12,15], arp_alt=14, arp_pat=[0,2,4,2,1,3,5,3, 0,2,4,5,3,2,1,2], arp_rest={6,14},
  bass_hits=[(0,4),(6,2),(8,4),(14,2)], kick=[0,8], snare=[], clank=[4,12],
  hat_gap={0,1,3,5,7,8,9,11,13,15}, war_hits=[0,8],
  mel_base=62,
  mel_ph={1:[(0,4,0),(4,4,3),(8,8,7),(16,4,5),(20,4,3),(24,8,2)],
          2:[(0,8,3),(8,4,5),(12,4,7),(16,8,10),(24,8,7)],
          3:[(0,4,10),(4,4,7),(8,4,5),(12,4,3),(16,16,0)],
          4:[(0,6,7),(6,2,5),(8,8,3),(16,8,5),(24,8,0)]},
  mel_seq=[1,2,3,4, 1,2,1,3, 2,3,4,1, 2,3,4,4],
  clank_f=520, bdrive=2.0, lead_cut=2600)

LEVELS = {
  'base': L([(0, 2, .7), (2, 30, 1.0), (30, 32, .7)]),
  'arp':  L([(0, 2, .6), (2, 32, 1.0)]),
  'mel':  L([(6, 14, .8), (14, 22, 1.0), (22, 26, .7), (26, 28, .9)]),
  'drm':  L([(4, 8, .35), (8, 28, .5)]),
  'str':  L([(0, 32, .55)]),
  'war': L([]), 'tns': L([]),
}
WEIGHT = {'base': .9, 'arp': 1.5, 'mel': .7, 'drm': .6, 'str': .5, 'war': 0, 'tns': 0}

def main():
    S, N, step = mm.build(SPEC); spb = 16 * step
    mix = np.zeros((N, 2))
    for k, x in S.items():
        if WEIGHT[k] == 0: continue
        x = x - x.mean(axis=0)
        x = x * (mm.REF[k] * (.8 if k == 'base' else 1.0) / (np.sqrt(np.mean(x ** 2)) + 1e-9))
        mix += x * WEIGHT[k] * bar_env(LEVELS[k], SPEC['bars'], spb)[:, None]
    mix -= mix.mean(axis=0)
    mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) * .85
    full = np.concatenate([mix[-int(LEAD * SR):], mix, mix[:int(LEAD * SR)]])
    os.makedirs(OUT, exist_ok=True); wv = os.path.join(OUT, '_col.wav')
    with wave.open(wv, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(full, -1, 1) * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wv, '-b:a', '160k', os.path.join(OUT, 'collection.mp3')], check=True); os.remove(wv)
    print('collection loop samples =', N, ' seconds =', N / SR)

if __name__ == '__main__':
    main()
