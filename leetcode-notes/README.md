# LeetCode Pattern Notes

A Chrome extension (Manifest V3) that watches for "Accepted" submissions on
LeetCode, opens a side panel pre-filled with the problem's name, difficulty,
tags, and URL, and asks you to fill in a structured note: pattern,
sub-pattern, recognition clues, core idea, invariant, real-life application,
edge cases, complexity, mistakes, and similar problems (plus optional data
structure / algorithm / company tags). A "✨ Fill with AI" button can draft
these fields for you using Google's Gemini API, based on the problem and
your accepted code. Notes are saved locally and are searchable later.

## How it works

- **inject.js** runs in the page's own JS context (`"world": "MAIN"`) so it
  can see LeetCode's internal `fetch` calls. It watches for the submission
  "check" endpoint and detects when the response is `Accepted`.
- **content.js** runs in the extension's isolated world, listens for that
  signal, scrapes the problem name/difficulty/tags from the DOM, and messages
  the background worker.
- **background.js** stores the problem data and opens the Chrome side panel.
- **sidepanel.html / panel.js / panel.css** is the note-taking UI. It
  pre-fills from the pending problem, lets you fill in the structured fields,
  and saves everything to `chrome.storage.local`. It also has a searchable
  "All notes" view.
- **"✨ Fill with AI"** sends the problem name, difficulty, tags, and your
  captured code to Google's Gemini API (`generativelanguage.googleapis.com`,
  model `gemini-flash-latest`) and uses the response to fill in any fields you
  haven't already typed into — it never overwrites text you've written.
  Requires a Gemini API key. There are two ways to set one:
  - **Permanent (recommended for personal use):** copy `config.example.js`
    to `config.js` and paste your key in. `config.js` is gitignored and
    loaded directly by `sidepanel.html`, so the key persists even if
    extension storage is ever cleared, and you never have to re-enter it.
  - **Per-browser-profile:** leave `config.js` blank and set a key via the
    "API Key" button top-right instead -- it's stored in
    `chrome.storage.local` (`geminiApiKey`).

  Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

Everything is stored locally in the browser via `chrome.storage.local` — no
backend, no account. The only outbound network call besides LeetCode itself
is the optional Gemini request when you click "Fill with AI". If you later
want to sync notes to your own database, the natural extension point is the
`chrome.storage.local` calls in `panel.js` (swap or mirror them with a
`fetch` to your API).

## Note-taking template

Every note captures these fields, in this order:

1. **Pattern** — the high-level pattern (e.g. sliding window, two pointers)
2. **Sub-pattern** — the specific variant (e.g. variable-size window)
3. **Recognition clues** — what in the problem statement should trigger this pattern next time
4. **Core idea** — the mechanism, in your own words
5. **Invariant** — what stays true throughout the algorithm at every step
6. **Real-life application** — where this shows up in practice
7. **Edge cases** — empty input, duplicates, negatives, etc.
8. **Time & space complexity**
9. **Mistakes I made** — what tripped you up
10. **Similar problems** — LeetCode numbers/names to revisit

Data structure, algorithm, and company tags are still captured as optional
extras below the main template.

## Load it into Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder (`leetcode-notes/`)
5. Go to any LeetCode problem, solve it, and submit

When your submission comes back Accepted, the side panel should open
automatically, pre-filled. Click the extension's toolbar icon any time to
open the panel manually (e.g. to browse "All notes" or start a note by hand).

## Notes on LeetCode's markup

LeetCode's DOM classes and API shapes change periodically. The two spots
most likely to need updating over time are:

- `content.js` → `getDifficulty()`, `getTags()`, `getProblemName()` (DOM
  selectors)
- `inject.js` → the `url.includes("/submissions/detail/")` check (API path)

If detection stops working after a LeetCode redesign, open the browser
console on a problem page after submitting, inspect the network request that
fires when the result appears, and update the URL match / JSON field names
accordingly.

## Roadmap ideas

- Export notes to Markdown/CSV/Anki deck for spaced repetition
- Sync to a personal database (Supabase, Notion API, etc.)
- Group the "All notes" view by pattern instead of a flat search
- Track review streaks — surface problems you haven't revisited in 2+ weeks
