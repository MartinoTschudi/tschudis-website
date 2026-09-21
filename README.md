# tschudis.ch

The Tschudi family landing page — one word, alive.

`tschudis` sits centred in Archivo (variable weight + width). Each letter is a damped spring: it leans away from the cursor, compresses when pressed, can be dragged, bumps into its neighbours and is pulled back home. Fast swipe through the word → the letters scatter, a confetti burst, then they settle. Tap/click → the family flinches together. Occasionally (mostly when the page has been still) a tiny vector scene appears for a few seconds: a ridge, a sun, a wave, a sailboat-sized car, a door in the *d*, a paper plane, rarely snow. The palette drifts between six moods over minutes.

No build step, no dependencies, plain ES modules:

- `index.html` – shell, font, CSS
- `main.js` – physics, input, entrance, signature swipe, scheduler wiring
- `palette.js` – moods + OKLab crossfade, ambient light
- `scenes.js` – single-slot scene scheduler + confetti
- `scenes-ground.js`, `scenes-sky.js` – the scene library

Hosted via GitHub Pages (`CNAME` → www.tschudis.ch). Preview locally with any static server (ES modules need http://, not file://), e.g. `python3 -m http.server`.
