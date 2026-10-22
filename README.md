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
