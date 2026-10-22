// Setup view: repository, access token and its expiry date
import { DEFAULT_REPO, TOKEN_WARN_DAYS } from "./config.js";
import { load } from "./load.js";
import { bar, stopPolling } from "./saving.js";
import { app, state } from "./state.js";
import { store } from "./store.js";

export function setupView(error) {
  stopPolling();
  state.fetchedAt = 0;
  bar.classList.remove("show");
  document.body.classList.remove("has-savebar");
  const hasToken = !!store.get("token");
  app.innerHTML = document.getElementById("setup-tpl").innerHTML;
  const errorEl = document.getElementById("setup-error");
  error ? errorEl.textContent = error : errorEl.remove();
  document.getElementById("repo").value = store.get("repo") || DEFAULT_REPO;
  document.getElementById("expires").value = store.get("tokenExpires") || "";
  document.getElementById("setup-warn-days").textContent = TOKEN_WARN_DAYS;
  // Cancel goes back to the status page, so only when there is a token to go back with.
  const cancel = document.getElementById("setup-cancel");
  hasToken ? cancel.onclick = () => load() : cancel.remove();
  document.getElementById("setup-form").onsubmit = e => {
    e.preventDefault();
    store.set("repo", document.getElementById("repo").value.trim());
    store.set("token", document.getElementById("token").value.trim());
    const expires = document.getElementById("expires").value;
    expires ? store.set("tokenExpires", expires) : store.del("tokenExpires");
    // Start over from the cache and draft of this repository.
    state.reportText = state.base = state.settings = null;
    load();
  };
}
