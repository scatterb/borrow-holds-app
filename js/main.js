// Entry point: first load, home screen shortcuts, and refreshing when the app comes back
import { STALE_MS } from "./config.js";
import { load } from "./load.js";
import { openMagazines } from "./magazines.js";
import { runNow } from "./saving.js";
import { state } from "./state.js";
import { store } from "./store.js";
import { notify } from "./toolbar.js";

// Phones keep the app open in the background for days: update when it comes back.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.fetchedAt && !state.busy && Date.now() - state.fetchedAt > STALE_MS) load();
});

// Shortcuts on the home screen icon: "Run now" opens ?run=1, "Magazines" ?mags=1.
const params = new URLSearchParams(location.search), runOnOpen = params.has("run");
if (runOnOpen || params.has("mags")) history.replaceState(null, "", location.pathname);
const magsOnOpen = params.has("mags");
load().then(() => {
  if (magsOnOpen && store.get("token")) openMagazines();
  if (runOnOpen && state.fetchedAt && !state.polling) runNow().catch(e => notify(e.message, true));
});
