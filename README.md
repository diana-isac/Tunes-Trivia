# Tunes & Trivia

`Tunes & Trivia` is a single-file browser game built for a Babson-themed event. It presents a short music-and-trivia quiz, collects a player name, scores the run, and shows a local leaderboard.

The project currently lives entirely in [`tunes_and_trivia_babson_green.html`](/C:/Users/disac1/Tunes-Trivia-1/tunes_and_trivia_babson_green.html). There is no build step, backend, or framework.

## What the HTML Does

The page combines structure, styling, and application logic in one file:

- HTML defines a sticky top navigation, a main content container, and a script block that renders the app dynamically.
- CSS creates the Babson-green visual theme, animated vinyl-inspired background details, cards, buttons, progress dots, result state, and leaderboard styling.
- JavaScript drives the quiz flow, tab switching, scoring, persistence, and leaderboard rendering.

## App Flow

When the page loads, it renders the `Play` screen by default.

1. The player enters a name.
2. The app walks through 5 hard-coded multiple-choice questions.
3. Each answer must be selected and then confirmed with `Lock In`.
4. At the end, the app calculates the score and stores it locally.
5. The result screen shows a circular score indicator and a message based on the final score.
6. The player can replay or switch to the leaderboard.

## Views

### Play View

The landing screen includes:

- Event branding: `Tunes & Trivia`
- Babson/Horn Commons event copy
- Name input
- Start button
- Promotional callouts for coffee, prizes, and the record-player giveaway

### Question View

Each question screen includes:

- A progress indicator for all five questions
- A `Trivia` or `Finish the Lyric` label based on question type
- Four answer choices
- Immediate visual feedback after submission:
  - selected answer highlight before submission
  - correct answer highlight after submission
  - wrong selected answer highlight after submission

### Result View

After the final question, the app:

- computes the number of correct answers
- shows a score ring based on percentage
- selects a message tier:
  - `5`: perfect score
  - `4`: close
  - `3`: decent run
  - `0-2`: nice try

### Leaderboard View

The leaderboard:

- loads locally saved scores
- sorts by highest score first
- breaks ties by earlier timestamp first
- shows only the top 10 entries
- refreshes every 3 seconds while the leaderboard tab is active
- includes a `Clear Scores (Host Only)` button that wipes the stored leaderboard in the current browser

## Data Storage

Scores are stored client-side under the key `trivia-scores-green`.

The page originally expected a `window.storage` API. A local fallback was added so the app now works in a normal browser using `localStorage` with the same async-style interface.

Important implications:

- There is no shared multiplayer leaderboard.
- Scores are only visible in the same browser/profile/device.
- Clearing browser storage will remove saved scores.

## Question Set

The current quiz contains 5 built-in questions:

- Grammy wins record holder
- Queen lyric completion
- Spotify public launch year
- Black Eyed Peas lyric completion
- Birthplace of jazz

To change the quiz, edit the `QUESTIONS` array in [`tunes_and_trivia_babson_green.html`](/C:/Users/disac1/Tunes-Trivia-1/tunes_and_trivia_babson_green.html).

## Running the Project

Because this is a static HTML app, you can run it with any simple local server.

Example with Python:

```powershell
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/tunes_and_trivia_babson_green.html
```

You can also open the file directly in a browser, but serving it over HTTP is the cleaner option.

## External Dependencies

There are only two runtime dependencies outside the file itself:

- Google Fonts for `Bebas Neue` and `DM Sans`
- Browser `localStorage` for saved scores

If Google Fonts is blocked, the app still functions but falls back to browser fonts.

## Current Limitations

- All content is hard-coded in one file.
- There is no server-side persistence.
- The leaderboard is local to one browser.
- The `Clear Scores` button has no authentication.
- The app uses inline event handlers and direct `innerHTML` rendering throughout.

## Suggested Next Improvements

- split HTML, CSS, and JS into separate files
- move quiz data into a JSON file or admin-editable format
- add a real shared backend leaderboard
- add host controls behind authentication
- normalize copy and encoding to ensure symbols render consistently everywhere
