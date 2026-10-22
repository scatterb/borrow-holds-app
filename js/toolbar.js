// Toolbar: last update / run status, Magazines button, ☰ menu, and notices below it
import { TOKEN_WARN_DAYS } from "./config.js";
import { daysFrom, parseIso, today, when } from "./dates.js";
import { load } from "./load.js";
import { openMagazines } from "./magazines.js";
import { runNow, save, setDirty, withBusy } from "./saving.js";
import { setupView } from "./setup.js";
import { app, state } from "./state.js";
import { store } from "./store.js";
import { escapeHtml } from "./util.js";

function statusHtml() {
  // One line for both the status page's age and the last run: they only differ when a run fails or is going on.
  const { reportMeta, lastRun } = state;
  let html = "";
  const updated = reportMeta && `Updated ${when(reportMeta.at)}`
    + (reportMeta.mode && reportMeta.mode !== "changes applied" ? ` · ${escapeHtml(reportMeta.mode)}` : "");
  if (state.polling) html += `<span class="run running">${updated ? updated + " · " : ""}Run in progress…</span>`;
  else if (lastRun) {
    const done = lastRun.status === "completed", ok = lastRun.conclusion === "success";
    const label = !updated ? `Last run ${when(lastRun.created_at)}`
      : done && !ok ? `${updated} · last run ${when(lastRun.created_at)}` : updated;
    html += `<a class="run${done && !ok ? " failed" : ""}" href="${escapeHtml(lastRun.html_url)}" target="_blank" rel="noopener"
      title="Last run ${when(lastRun.created_at)}: ${done ? escapeHtml(lastRun.conclusion) : "running"}">${label} ${!done ? "…" : ok ? "✓" : "failed ✗"}</a>`;
  } else if (updated) html += `<span class="run">${updated}</span>`;
  const expires = store.get("tokenExpires");
  if (expires) {
    const days = daysFrom(today(), parseIso(expires));
    if (days <= TOKEN_WARN_DAYS)
      html += `<button class="warn" id="renew">${days < 0 ? "Token expired" : days === 0 ? "Token expires today" : `Token expires in ${days} d`}</button>`;
  }
  return html;
}

// The toolbar's markup; bindToolbar() fills in the status line.
export const toolbar = () => document.getElementById("toolbar-tpl").innerHTML;

function closeMenu() {
  const menu = document.getElementById("menu");
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  document.getElementById("menu-btn").setAttribute("aria-expanded", false);
}
document.addEventListener("click", e => { if (!e.target.closest(".menu")) closeMenu(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

export function bindToolbar() {
  const menu = document.getElementById("menu"), menuBtn = document.getElementById("menu-btn");
  menuBtn.onclick = () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false;
    menuBtn.setAttribute("aria-expanded", true);
  };
  menu.onclick = e => { if (e.target.closest("button")) closeMenu(); };
  document.getElementById("refresh").onclick = () => load();
  document.getElementById("mags-open").onclick = () => openMagazines();
  document.getElementById("signout").onclick = () => {
    if (!confirm("Remove the access token and the saved copy from this browser?" + (state.dirty ? " Unsaved changes are lost." : ""))) return;
    for (const k of ["token", "cache", "draft"]) store.del(k);
    state.reportText = state.base = state.settings = state.lastRun = state.magazines = state.reportMeta = null;
    setDirty(false);
    navigator.clearAppBadge?.().catch(() => {});
    setupView();
  };
  document.getElementById("run").onclick = () => state.dirty
    ? withBusy(async () => { await save(); await runNow(); })
    : runNow().catch(e => notify(e.message, true));
  paintStatus();
}

export function paintStatus() {
  const status = app.querySelector(".toolbar .status");
  if (!status) return;
  status.innerHTML = statusHtml();
  const renew = document.getElementById("renew");
  if (renew) renew.onclick = () => (!state.dirty || confirm("Unsaved changes stay as a draft. Continue?")) && setupView();
  document.getElementById("run").disabled = !!state.polling;
}

export function notify(text, isError) {
  const bar = app.querySelector(".toolbar");
  if (!bar) return;
  let el = document.getElementById("notice");
  if (!el) { el = document.createElement("p"); el.id = "notice"; bar.after(el); }
  el.className = "message" + (isError ? " error" : "");
  el.textContent = text;
}
