# lab

Development tooling for balance testing, bot tuning, deck search and asset generation. Nothing here is deployed or required to play.

Run everything from inside `lab/`. Output paths such as `--out sim_out/x` are relative to where you run. Tools read the game from `../game` by default; override with `--project <dir>`. Requirements: Node.js 18+, and Python 3 with `numpy` for the asset generators.

## Layout

| Folder | Contents |
|---|---|
| `tools/` | `sim.js`, `compare_reports.js`, `tune_bot.js`, `deck_search.js`, `validate_decks.js`, `bot_ab.js`, `lib_game.js`, `deckcode.js`, plus `make_*.py` asset generators that write into `../game/` |
| `patches/` | Balance patches in `cards-live.json` format, and an empty template |
| `sim_out/` | Simulation runs, including a before/after pair for a balance patch |
| `reports/` | Basic-bot vs smart-bot comparison reports |
| `results/` | Bot-tuning output and premade-deck search and validation results |
| `deck_out_v2/` | Raw deck-search output behind the current premade decks |
| `archive/` | Retired assets kept out of the shipped build |

CSV files are git-ignored and stay local.

## Simulator: `tools/sim.js`

Plays bot-vs-bot games using the real engine and bot, and writes per-card, per-deck and per-pair CSVs plus a readable `report.txt`.

```bash
node tools/sim.js                                    # 20,000 field games, Basic bot, all cores
node tools/sim.js --games 100000 --bot smart         # slower, stronger pilot
node tools/sim.js --mode swap                        # "swap one card in" experiment
node tools/sim.js --mode both --out sim_out/run1
node tools/sim.js --live patch.json --out sim_out/patched
```

| Option | Meaning |
|---|---|
| `--mode field\|swap\|both` | `field`: random matchups from a deck pool (default). `swap`: replace one card of a deck with card X, which gives the cleanest per-card power estimate |
| `--games N` | Field games (default 20000) |
| `--bot basic\|smart` | Pilot used by both sides (default `basic`) |
| `--weights file.json` | Smart bot evaluation weights from `tune_bot.js` |
| `--workers N` | Parallel threads (default: CPU cores) |
| `--seed N` | Random seed; same seed and options give the same results |
| `--random-decks K` | Add K random legal decks to the premade ones (default 60) |
| `--decks file` | Custom deck pool (JSON, or text with one deck code per line) |
| `--live file.json` | Patch cards first, to A/B test a balance change |
| `--first random\|bot` | Who goes first |
| `--swap-games N`, `--base-games N` | Swap-mode sample sizes (defaults 3000 and 1500) |
| `--min-games N` | Minimum sample for a card to appear in rankings (default 300) |
| `--games-csv N` | Also write `games.csv` with the first N games |
| `--out dir` | Output folder (default `sim_out/<timestamp>`) |
| `--project dir` | Folder holding `cards.js`, `engine.js`, `bot.js` |

## Balance patch workflow

```bash
node tools/sim.js --mode both --bot smart --out sim_out/v2                                # baseline
node tools/sim.js --mode both --bot smart --live patches/patch_v1.json --out sim_out/v3   # with patch
node tools/compare_reports.js sim_out/v2 sim_out/v3 --metric delta_seen                   # card-by-card effect
```

If the patch looks good, copy its values into `game/cards.js`, or host it and point `game/live-config.js` at it.

`compare_reports.js` options: `--metric delta_seen|wr_in_deck|swap`, `--top N`, `--min-games N`, `--out dir`. A Spearman rho near 1 means both runs rank cards the same way. When comparing two different bots, a large rank shift usually means one bot plays that card badly, so don't balance from that data alone. When comparing the same bot before and after a patch, shifts are the effect of the patch plus noise.

## Other tools

```bash
node tools/tune_bot.js                                  # evolve Smart-bot weights by self-play -> bot_weights.json
node tools/tune_bot.js --validate bot_weights.json --vgames 800
node tools/bot_ab.js --games 1000 --workers 2           # A/B test bot settings, 95% interval on win rate
node tools/deck_search.js --quick                       # smoke test (~2 min); drop --quick for a full search
node tools/deck_search.js --prior sim_out/v3/cards.csv  # search premade decks (MAP-Elites over playstyle cells)
node tools/validate_decks.js --decks deck_out/proposed_premade_decks.json   # held-out check on fresh seeds
python3 tools/make_img_index.py                         # regenerate game/img-index.js after adding card art
python3 tools/make_sfx.py                               # regenerate the 51 sound effects (needs numpy)
python3 tools/make_music.py                             # render the static theme
python3 tools/make_music_stems.py                       # render the seven dynamic stems
```

- **Bot tuning** adjusts evaluation weights via a small evolution strategy. Results are validated on many more games, and the output file records whether the improvement is statistically solid. Nothing changes the game until you copy numbers into `bot.js`.
- **Deck search** finds strong *and different* 30-card decks by keeping the best deck per playstyle cell (average cost, creature density, dominant tribe). It writes importable deck codes and a `DECKS` block ready to paste into `cards.js`. Re-run it after card changes.
- **Deck validation** matters because search picks decks on the same games it measures them on, so its win rates are optimistic.

Deck files accepted by every tool's `--decks` option: a `.json` array of `{"n": "name", "c": [30 ids]}`, or a text file with one deck per line (`Name: CODE` or just the code). Codes use the same format as the in-game Import and Export.


## Reliable workflow (see METHOD.md for the evidence)

```bash
node tools/card_effects.js all --games 30000 --out results/ce1                 # diagnose card power
node tools/calibrate.js --rounds 3 --out results/cal1                          # find + verify stat edits (~15 min on 2 cores)
node tools/calibrate.js --levers atk,hp,amt --out results/cal_nocost           # same, never touching mana costs
node tools/meta_psro.js --iters 40 --live results/cal1/patch_final.json --check-pilot classic --out results/meta1
node tools/meta_psro.js --decks sim_out/1.0.0/proposed_premade_decks.json --iters 0 --out results/meta_old   # score an existing deck set
node tools/benchmark_reliability.js --games 20000                              # test the tests
```
`sim.js --mode swap` and `delta_seen` are kept but should not be used for balancing. `--bot basic` now really uses the basic bot.
