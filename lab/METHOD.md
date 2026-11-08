# Reliable method for fair card stats and deck learning

## What changed and why (measured, see results/calibrate_example/)
- Old "swap one card in" estimate: test-retest r = 0.12 (almost pure noise). Old field estimate: repeatable but overconfident SEs.
  New regression estimator (card_effects.js): far higher reliability at equal compute (bench_report_before_anchor.txt).
- Draw-based effects rank cards correctly but their pp are ~20-25% too large vs the design-based (cards-in-deck) estimate.
  card_effects.js now rescales them with a split-half "anchor", and centres effects on the average card.
- Results depend on the bot piloting: basic vs classic bot agree at only ~0.84 (noise-corrected). calibrate.js therefore only edits
  cards a second pilot also flags, and (--select minimax) picks the edit with the smallest worst-case deviation over both pilots.
- sim.js / lib_game.js: `--bot basic` silently ran the Smart bot. Fixed (basic is now really basic, ~14x faster; old sim_out results used Smart).
- meta_psro.js: the "exploitability <=" claim was invalid (a failed search is not a proof). Now reported as a lower bound.
  New `--decks file --iters 0` scores any deck set (e.g. old deck_search output) with the same challenge. lib_pool listener leak fixed.

## Workflow
    node tools/card_effects.js all --games 30000 --out results/ce1              # diagnose: which cards are OVER/UNDER vs cost peers
    node tools/calibrate.js --rounds 3 --games 24000 --final-games 40000 --audit-games 8000 --out results/cal1
         # optional: --levers atk,hp,amt (no mana changes)  --select basic|minimax  --margin 1.5
         # -> report.txt, patch_final.json (use with --live), fresh-seed before/after verification
    node tools/meta_psro.js --iters 40 --patience 4 --live results/cal1/patch_final.json --check-pilot classic --out results/meta1
    node tools/meta_psro.js --decks sim_out/1.0.0/proposed_premade_decks.json --iters 0 --out results/meta_old   # score old decks
    node tools/benchmark_reliability.js --games 20000                            # re-test the estimators

## Example result (cal1, basic pilot, 14 min on 2 cores; fresh seeds, 40k games per side)
Cards outside +/-1.5pp of cost peers: OVER 8 / UNDER 13 -> OVER 1 / UNDER 3. Real spread of card effects 1.60pp -> 0.97pp
(noise floor 0.21). Second pilot (classic): spread 1.25 -> 0.89pp. 23 cards edited, 0 reverted.

## Not verified / limits
- The minimax run (results/calibrate_example/report_minimax.txt, if present) was interrupted; PSRO full runs and the re-run of
  benchmark_reliability.js with the anchor were never completed. Only smoke tests of meta_psro were run.
- Everything is measured with bots; playtest edited cards with humans. Edits can leave card text stale (HellFire amount was auto-edited; check wording).
- Many UNDER fixes lower cost to 0; use --levers to avoid that. Tier-level cost means are design-dependent; only within-tier verdicts are robust.
- Additive per-card model: synergies are not modelled.
