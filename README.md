# Tunes & Trivia Project

A small browser game for live music-and-trivia events. Players enter a name, answer six questions, and land on a local leaderboard.

## What is included

- a static front-end with separate `HTML`, `CSS`, and `JavaScript`
- music trivia and lyric-completion questions
- leaderboard persistence with a custom `window.storage` adapter when available
- automatic fallback to browser `localStorage`
- a simple Node static server for local use

## Project files

- `index.html`: app shell
- `styles.css`: visual system and responsive layout
- `app.js`: questions, game state, rendering, and storage
- `server.js`: local static server

## Run locally

```powershell
npm start
```

Then open:

```text
http://127.0.0.1:8000
```

If you do not want to use Node, you can also serve the folder with any other static file server.

## Notes

- Scores are stored under `tunes-and-trivia-scores`.
- Ranking is sorted by highest score first, then earliest completion time.
- To customize the game, edit the `QUESTIONS` array in `app.js`.
