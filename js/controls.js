// Controls added to the status page: Got it, stars, Done (returning) and pausing a format
import { addDays, fi, iso, parseIso, today } from "./dates.js";
import { changed } from "./saving.js";
import { app, state } from "./state.js";

export function enhance() {
  const t = today();

  // "New in circulation" stays flagged until noticed here (the next run drops it).
  for (const item of app.querySelectorAll(".attention .new-item[data-new-copies]")) {
    const id = item.dataset.newCopies;
    const btn = document.createElement("button");
    btn.className = "ctl-notice";
    btn.title = "Dismiss: the next run stops flagging it";
    const paint = () => {
      const on = state.settings.noticed.includes(id);
      item.classList.toggle("noticed", on);
      btn.textContent = on ? "Noticed ✓" : "Got it";
      for (const badge of app.querySelectorAll(`tr.hold[data-new-copies="${CSS.escape(id)}"] .badge.new`)) badge.style.display = on ? "none" : "";
    };
    btn.onclick = () => {
      const i = state.settings.noticed.indexOf(id);
      i >= 0 ? state.settings.noticed.splice(i, 1) : state.settings.noticed.push(id);
      paint(); changed();
    };
    paint();
    item.append(btn);
  }
  for (const card of app.querySelectorAll("section.card[data-managed='1']")) {
    const cat = card.dataset.cat;

    // Prioritise (star) reservations.
    for (const row of card.querySelectorAll("tr.hold[data-key]")) {
      const key = row.dataset.key;
      if (!key) continue;
      row.querySelector(".star")?.remove();
      const btn = document.createElement("button");
      btn.className = "ctl-star";
      btn.title = "Prioritise: comes first in this format's queue";
      const paint = () => {
        const on = (state.settings.priority[cat] || []).includes(key);
        btn.classList.toggle("on", on);
        btn.textContent = on ? "★" : "☆";
        btn.setAttribute("aria-pressed", on);
      };
      btn.onclick = () => {
        const list = state.settings.priority[cat] || (state.settings.priority[cat] = []);
        const i = list.indexOf(key);
        i >= 0 ? list.splice(i, 1) : list.push(key);
        paint(); changed();
      };
      paint();
      row.querySelector("td.title").prepend(btn);
    }

    // Mark loans as returning.
    for (const row of card.querySelectorAll("tr.loan[data-record]")) {
      const id = row.dataset.record;
      if (!id) continue;
      const cell = row.querySelector("td.badges");
      cell.querySelector(".badge.info")?.remove();
      cell.classList.remove("empty");
      const btn = document.createElement("button");
      btn.className = "ctl-return";
      btn.title = "Done with it: release the next one in this format now";
      const paint = () => {
        const on = state.settings.returning.includes(id);
        btn.classList.toggle("on", on);
        btn.textContent = on ? "Returning ✓" : "Done";
      };
      btn.onclick = () => {
        const i = state.settings.returning.indexOf(id);
        i >= 0 ? state.settings.returning.splice(i, 1) : state.settings.returning.push(id);
        paint(); changed();
      };
      paint();
      cell.prepend(btn);
    }

    // Pause the whole format for N days.
    const box = document.createElement("div");
    box.className = "ctl-pause";
    const release = parseIso(card.dataset.release || iso(t));
    const paintPause = () => {
      const until = state.settings.paused_until[cat];
      if (until && parseIso(until) >= t) {
        box.innerHTML = `<span class="paused">Paused by you until ${fi(parseIso(until))}</span> <button class="ctl-clear">Remove pause</button>`;
        box.querySelector(".ctl-clear").onclick = () => { delete state.settings.paused_until[cat]; paintPause(); changed(); };
      } else {
        box.innerHTML = `Busy with something of my own: move everything
          <input type="number" min="1" max="365" value="14" inputmode="numeric" aria-label="days"> days later
          <button class="ctl-apply">Pause</button> <span class="hint"></span>`;
        const input = box.querySelector("input"), hint = box.querySelector(".hint");
        const target = () => addDays(release > t ? release : t, Math.max(1, parseInt(input.value, 10) || 0));
        const showHint = () => hint.textContent = `→ nothing new before ${fi(target())}`;
        input.oninput = showHint; showHint();
        box.querySelector(".ctl-apply").onclick = () => { state.settings.paused_until[cat] = iso(target()); paintPause(); changed(); };
      }
    };
    paintPause();
    (card.querySelector(".release") || card.querySelector("header")).after(box);
  }
}

// Drop settings that no longer match anything on the page (returned loans, collected holds, past pauses).
export function pruneSettings() {
  const t = iso(today());
  const loanIds = new Set([...app.querySelectorAll("tr.loan[data-record]")].map(r => r.dataset.record));
  const holdKeys = new Set([...app.querySelectorAll("tr.hold[data-key]")].map(r => r.dataset.key));
  state.settings.returning = state.settings.returning.filter(id => loanIds.has(id));
  const flagged = new Set([...app.querySelectorAll("[data-new-copies]")].map(el => el.dataset.newCopies));
  state.settings.noticed = state.settings.noticed.filter(id => flagged.has(id));
  for (const cat of Object.keys(state.settings.priority)) {
    state.settings.priority[cat] = state.settings.priority[cat].filter(k => holdKeys.has(k));
    if (!state.settings.priority[cat].length) delete state.settings.priority[cat];
  }
  for (const [cat, until] of Object.entries(state.settings.paused_until)) if (until < t) delete state.settings.paused_until[cat];
}
