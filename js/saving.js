// Saving & running: the save bar, the unsaved draft, starting a workflow run and following it
import { WORKFLOW } from "./config.js";
import { pruneSettings } from "./controls.js";
import { cfg, gh, putSettings } from "./github.js";
import { load } from "./load.js";
import { renderReport } from "./report.js";
import { changeSummary, clone } from "./settings.js";
import { state } from "./state.js";
import { store } from "./store.js";
import { notify, paintStatus } from "./toolbar.js";

export const bar = document.getElementById("savebar");
const barInfo = document.getElementById("savebar-info");

export function setDirty(on) {
  state.dirty = on;
  bar.classList.toggle("show", on);
  document.body.classList.toggle("has-savebar", on);
}

// Call after every edit: updates the save bar and keeps unsaved edits as a draft in case the app is closed.
export function changed() {
  const summary = changeSummary();
  setDirty(summary.length > 0);
  barInfo.textContent = summary.join(" · ");
  state.dirty ? store.setJson("draft", { repo: cfg().repo, base: state.base, settings: state.settings }) : store.del("draft");
}

export async function save() {
  pruneSettings();
  const merged = await putSettings();
  state.base = clone(state.settings);
  const cache = store.json("cache");
  if (cache) store.setJson("cache", { ...cache, settings: JSON.stringify(state.settings) });
  if (merged) renderReport(state.reportText);
  changed();
}

export async function runNow() {
  const res = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, { method: "POST",
    body: JSON.stringify({ ref: "main", inputs: { apply: "true" } }) });
  if (res.status === 404) throw new Error("Workflow not found (is the token allowed to use Actions?)");
  const startedAt = Date.now();
  pollRun(async () => {
    const runs = await (await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=1&event=workflow_dispatch`)).json();
    const run = runs.workflow_runs?.[0];
    return run && Date.parse(run.created_at) >= startedAt - 60000 ? run : null;
  });
  notify("Run started. The page refreshes when it has finished (about 1–2 minutes).");
}

// Waits for the run that getRun() returns (null until it exists) to finish, then reloads.
export function pollRun(getRun) {
  clearInterval(state.polling);
  let tries = 0;
  state.polling = setInterval(async () => {
    try {
      tries++;
      const run = await getRun();
      if (run?.status === "completed") {
        stopPolling();
        state.lastRun = run;
        await load();
        if (run.conclusion !== "success") notify(`The run finished with “${run.conclusion}”. Open GitHub Actions for details.`, true);
      } else if (tries > 40) {
        stopPolling();
        notify("The run is taking long. Refresh later.");
      }
    } catch (e) { stopPolling(); notify(e.message, true); }
  }, 8000);
  paintStatus();
}

export function stopPolling() {
  clearInterval(state.polling);
  state.polling = null;
  paintStatus();
}

export async function withBusy(fn) {
  const buttons = bar.querySelectorAll("button");
  buttons.forEach(b => b.disabled = true);
  barInfo.textContent = "Saving…";
  state.busy = true;
  try { await fn(); }
  catch (e) { state.dirty ? barInfo.textContent = "Failed: " + e.message : notify(e.message, true); }
  finally { state.busy = false; buttons.forEach(b => b.disabled = false); }
}
document.getElementById("save").onclick = () => withBusy(async () => {
  await save(); notify("Saved. The next daily run uses these settings.");
});
document.getElementById("save-run").onclick = () => withBusy(async () => { await save(); await runNow(); });
document.getElementById("discard").onclick = () => {
  if (!confirm("Discard unsaved changes?")) return;
  state.settings = clone(state.base);
  renderReport(state.reportText);
  changed();
};
