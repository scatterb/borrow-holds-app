// Magazine search: a full-screen view over the status page
import { fi, parseIso } from "./dates.js";
import { state } from "./state.js";
import { escapeHtml } from "./util.js";

const magsView = document.getElementById("mags"), magsQuery = document.getElementById("mags-q");
const magsBody = document.getElementById("mags-body");
export const parseMagazines = text => { try { return text ? JSON.parse(text) : null; } catch { return null; } };
// Case and accent insensitive: "skona" finds "Sköna hem".
const fold = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// "2026:17" -> [2026, 17]; double issues like "2026:3-4" sort by their first number.
const issueKey = issue => (issue || "").split(":").map(n => parseInt(n, 10) || 0);
const newerIssue = (a, b) => { const [x, y] = [issueKey(a), issueKey(b)]; return (y[0] - x[0]) || ((y[1] || 0) - (x[1] || 0)); };

// The Android back button closes the view instead of leaving the app.
export function openMagazines() {
  if (magsView.hidden) history.pushState({ mags: 1 }, "");
  magsView.hidden = false;
  document.body.style.overflow = "hidden";
  renderMagazines();
  magsQuery.focus();
  magsQuery.select();
}
function hideMagazines() {
  magsView.hidden = true;
  document.body.style.overflow = "";
}
document.getElementById("mags-close").onclick = () => history.state?.mags ? history.back() : hideMagazines();
window.addEventListener("popstate", () => { if (!magsView.hidden) hideMagazines(); });
magsQuery.oninput = () => renderMagazines();

export function renderMagazines() {
  if (magsView.hidden) return;
  const { magazines } = state;
  const issues = magazines?.issues || [];
  if (!issues.length) {
    magsBody.innerHTML = `<p class="hint">No magazine loans yet. They appear after the next daily run, or start one with “Run now” in the ☰ menu.</p>`;
    return;
  }
  // Issues are newest borrowed first, so names come out most recently borrowed first.
  const byName = new Map();
  for (const e of issues) {
    if (!byName.has(e.name)) byName.set(e.name, []);
    byName.get(e.name).push(e);
  }
  const updated = magazines.updated ? `Loans up to ${fi(parseIso(magazines.updated))}.` : "";
  const q = fold(magsQuery.value.trim());
  if (!q) {
    magsBody.innerHTML = `<p class="hint">Type a name, or pick one. ${updated}</p><div class="mags-chips">${
      [...byName.keys()].map(n => `<button data-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("")}</div>`;
    for (const b of magsBody.querySelectorAll("[data-name]"))
      b.onclick = () => { magsQuery.value = b.dataset.name; renderMagazines(); };
    return;
  }
  const hits = [...byName].filter(([name, list]) => fold(name).includes(q) || list.some(e => fold(e.title).includes(q)));
  magsBody.innerHTML = (hits.length ? hits.map(([name, list]) => {
    // One line per issue, newest issue first, with every date it was borrowed.
    const dates = new Map();
    for (const e of list) dates.set(e.issue, [...(dates.get(e.issue) || []), fi(parseIso(e.borrowed))]);
    const rows = [...dates].sort(([a], [b]) => newerIssue(a, b)).map(([issue, ds]) =>
      `<li><span class="issue">${escapeHtml(issue ? issue.replace(":", " : ") : "?")}</span>
           <span class="dates">${ds.map(escapeHtml).join(", ")}</span></li>`).join("");
    return `<section class="mag"><h2>${escapeHtml(name)} <span class="hint">${dates.size} issue${dates.size === 1 ? "" : "s"}</span></h2>
      <ul>${rows}</ul></section>`;
  }).join("") : `<p class="hint">No borrowed magazine matches “${escapeHtml(magsQuery.value.trim())}”.</p>`)
    + `<p class="hint">${updated}</p>`;
}
