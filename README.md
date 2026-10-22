# borrow-holds-app

Phone page for [borrow-holds](https://github.com/scatterb/borrow-holds) (private).
This repository contains only the page itself, no personal data: when opened, it
reads the status page and settings from the private repository with a GitHub
access token that is stored only in your browser.

Published with GitHub Pages (Settings → Pages → Deploy from branch → main / root).

## Features

- Star reservations, mark loans as returning and pause a format; the save bar lists
  the pending changes and can save, save & run, or discard them.
- A reservation the library had only ordered is flagged **New in circulation** once it has
  copies (green badge and a box on top), so you can star it. **Got it** dismisses the flag;
  otherwise it goes away after 14 days or when the item is on its way.
- Unsaved changes are kept as a draft in the browser, so closing the app loses nothing.
  If `settings.json` changed on GitHub meanwhile, your edits are merged on top of it.
- Opens instantly with the last saved copy and updates it in the background; also
  refreshes when the app comes back to the foreground after a few minutes.
- The toolbar shows the last workflow run (✓ / ✗, linking to GitHub Actions) and
  follows a run in progress. **▶ Run** starts a run (saving first if needed).
- **Magazines** searches the magazines you have borrowed (`data/magazines.json`): each
  issue newest first, with the dates you borrowed it. Also a home screen shortcut (Android).
- Borrowed tables sort by due date or by renewals left (fewest first; loans reserved by
  others count as 0). The choice is remembered.
- Cards are collapsible, remember which ones were open, and can be opened or closed all at once.
- Optional token expiry date in the setup: a reminder appears 14 days before.
- Installed as an app: a "Run now" shortcut on the home screen icon (Android) and a badge
  with the number of things to pick up or return (where the browser supports badges).

Sign out removes the token, the saved copy and any draft from the browser.

## Code layout

Plain HTML, CSS and native ES modules: no build step, GitHub Pages serves the files as they are.

- `index.html`: the page's markup, including the setup view and toolbar as `<template>`s.
- `style.css`: the app's own styles (the status page brings its own).
- `js/main.js`: entry point: first load, home screen shortcuts, refresh when the app comes back.
- `js/state.js`: state shared by the modules, kept in one `state` object.
- `js/github.js`: GitHub API calls; `js/settings.js`: parsing and merging `settings.json`.
- `js/load.js`: loads everything, showing the saved copy first.
- `js/report.js`: shows the status page; `js/controls.js`: the stars, Done, Got it and pause controls on it.
- `js/saving.js`: save bar, draft, saving, running the workflow and following the run.
- `js/setup.js`, `js/toolbar.js`, `js/magazines.js`: the setup view, toolbar and magazine search.
- `js/config.js`, `js/store.js`, `js/dates.js`, `js/util.js`: constants and small helpers.

GitHub Pages lets browsers cache files for about 10 minutes, so right after a push a phone may mix
old and new files for a while. A refresh after a few minutes fixes it.
