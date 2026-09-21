# tschudis.ch

The Tschudi family landing page — one word, alive.

`tschudis` sits centred in Archivo (variable weight + width). Each letter is a damped spring, linked to its neighbours. Nothing else on the page.

**Touch (primary):** press a letter to hold it, drag it around, flick to throw it; hold two with two fingers; tap empty space and the word flinches; sweep a finger fast across the word to scatter it. Tilt the phone and the word leans. It always settles back into `tschudis`.

**Mouse:** letters lean gently away from a close cursor; click-drag and fast sweeps work the same.

Colours drift slowly between six moods.

No build step, no dependencies, plain ES modules: `index.html`, `main.js` (physics + input), `palette.js` (colour moods).

Hosted via GitHub Pages (`CNAME` → www.tschudis.ch). Preview locally with any static server (ES modules need http://), e.g. `python3 -m http.server`.
