// Showing the status page: its styles and content, summary pills, collapsible cards, loan sorting
import { enhance } from "./controls.js";
import { app, state } from "./state.js";
import { store } from "./store.js";
import { bindToolbar, toolbar } from "./toolbar.js";
import { escapeHtml } from "./util.js";

export function renderReport(htmlText) {
  state.reportText = htmlText;
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  let style = document.getElementById("report-style");
  if (!style) { style = document.createElement("style"); style.id = "report-style"; document.head.prepend(style); }
  style.textContent = [...doc.querySelectorAll("style")].map(s => s.textContent).join("\n");
  app.innerHTML = toolbar() + (doc.querySelector("main")?.outerHTML || "");
  takeMeta();
  bindToolbar();
  styleSummary();
  enhance();
  addLoanSort();
  makeCollapsible();
  updateBadge();
}

// The toolbar shows the page's "Updated …" together with the last run, so take it out of the page.
function takeMeta() {
  const meta = app.querySelector(".top .meta");
  const m = meta?.textContent.match(/Updated (\d+)\.(\d+)\.(\d+) (\d+):(\d+)(?: · (.*))?/);
  state.reportMeta = m && { at: new Date(m[3], m[2] - 1, m[1], m[4], m[5]), mode: (m[6] || "").trim() };
  if (state.reportMeta) meta.remove();
}

// "23 borrowed" -> bold number and a colour per kind.
function styleSummary() {
  const kinds = [["borrowed", "s-borrowed"], ["reserved", "s-reserved"], ["waiting", "s-pickup"], ["on the way", "s-transit"]];
  for (const span of app.querySelectorAll(".summary span")) {
    const m = span.textContent.trim().match(/^(\d+)\s+(.*)$/);
    if (!m) continue;
    span.innerHTML = `<b>${m[1]}</b> ${escapeHtml(m[2])}`;
    span.className = kinds.find(([word]) => m[2].startsWith(word))?.[1] || "";
    span.classList.toggle("zero", m[1] === "0");
  }
}

// Number of things to pick up or return soon on the home screen icon, where supported.
function updateBadge() {
  if (!navigator.setAppBadge) return;
  const n = app.querySelectorAll(".attention .pickup-item, .attention .due-item").length;
  (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
}

// Cards start closed; remember which ones were opened, also across visits.
const openCards = new Set(store.json("openCards") || []);
const collapsibleCards = () => [...app.querySelectorAll("section.card")].filter(c => c.querySelector(".card-head"));

function setCardOpen(card, open) {
  card.classList.toggle("open", open);
  card.querySelector("header").setAttribute("aria-expanded", open);
  open ? openCards.add(card.dataset.cat) : openCards.delete(card.dataset.cat);
  store.setJson("openCards", [...openCards]);
  paintToggleAll();
}

function paintToggleAll() {
  const all = document.getElementById("toggle-all");
  if (all) all.textContent = collapsibleCards().every(c => c.classList.contains("open")) ? "Close all" : "Open all";
}

function makeCollapsible() {
  for (const card of app.querySelectorAll("section.card")) {
    if (!card.querySelector(":scope > h3")) continue;
    const header = card.querySelector("header");
    const head = document.createElement("div"), body = document.createElement("div");
    head.className = "card-head"; body.className = "card-body";
    let inBody = false;
    for (const el of [...card.children]) {
      if (el.tagName === "H3") inBody = true;
      (inBody ? body : head).append(el);
    }
    card.append(head, body);
    header.setAttribute("role", "button");
    header.tabIndex = 0;
    const toggle = () => setCardOpen(card, !card.classList.contains("open"));
    setCardOpen(card, openCards.has(card.dataset.cat));
    head.onclick = e => { if (!e.target.closest("button, input, a")) toggle(); };
    header.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };
  }
  // Open all / Close all sits right above the cards, sharing the row with "Nothing to pick up…" when that is shown.
  const cards = collapsibleCards(), grid = app.querySelector(".grid");
  if (!cards.length || !grid) return;
  const row = document.createElement("div");
  row.className = "ctl-gridbar";
  const clear = app.querySelector(".all-clear");
  if (clear) row.append(clear);
  row.insertAdjacentHTML("beforeend", `<button id="toggle-all"></button>`);
  grid.before(row);
  row.querySelector("#toggle-all").onclick = () => {
    const open = !cards.every(c => c.classList.contains("open"));
    cards.forEach(c => setCardOpen(c, open));
  };
  paintToggleAll();
}

// Borrowed tables come sorted by due date; optionally fewest renewals left first (unknown last),
// ties keeping the due date order. Loans reserved by others can't be renewed, so they count as 0.
// The choice applies to every card and is remembered.
function addLoanSort() {
  const renewals = row => {
    if ([...row.querySelectorAll(".badge")].some(b => b.textContent.trim() === "Reserved by others")) return 0;
    const n = parseInt(row.querySelector("td.num")?.textContent, 10);
    return isNaN(n) ? Infinity : n;
  };
  const tables = [];
  for (const h3 of app.querySelectorAll("section.card h3")) {
    const tbody = h3.nextElementSibling?.querySelector("tbody");
    if (!tbody?.querySelector("tr.loan")) continue;
    [...tbody.rows].forEach((row, i) => row.dataset.order = i);
    h3.classList.add("ctl-sorted");
    h3.insertAdjacentHTML("beforeend", `<span class="ctl-sort" role="group" aria-label="Sort">
      <button data-sort="due">Due</button><button data-sort="renewals">Renewals left</button></span>`);
    tables.push([h3, tbody]);
  }
  const apply = by => {
    store.set("loanSort", by);
    for (const [h3, tbody] of tables) {
      const rows = [...tbody.rows].sort((a, b) =>
        (by === "renewals" ? renewals(a) - renewals(b) || 0 : 0) || a.dataset.order - b.dataset.order);
      tbody.append(...rows);
      for (const b of h3.querySelectorAll("[data-sort]")) b.setAttribute("aria-pressed", b.dataset.sort === by);
    }
  };
  for (const [h3] of tables) for (const b of h3.querySelectorAll("[data-sort]")) b.onclick = () => apply(b.dataset.sort);
  apply(store.get("loanSort") === "renewals" ? "renewals" : "due");
}
