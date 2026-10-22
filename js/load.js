// Loading the status page, settings, last run and magazines from GitHub (and the saved copy first)
import { MAGAZINES_PATH, REPORT_PATH, SETTINGS_PATH } from "./config.js";
import { when } from "./dates.js";
import { cfg, getFile, getLastRun, gh } from "./github.js";
import { parseMagazines, renderMagazines } from "./magazines.js";
import { renderReport } from "./report.js";
import { changed, pollRun } from "./saving.js";
import { clone, mergeSettings, parseSettings } from "./settings.js";
import { setupView } from "./setup.js";
import { app, state } from "./state.js";
import { store } from "./store.js";
import { bindToolbar, notify, toolbar } from "./toolbar.js";
import { escapeHtml } from "./util.js";

let loading = null;

export function load() {
  if (!loading) loading = fetchAll().finally(() => loading = null);
  return loading;
}

async function fetchAll() {
  const { repo, token } = cfg();
  if (!repo || !token) return setupView();
  const draft = store.json("draft");
  if (state.reportText === null) {
    // First load: show the saved copy (with any unsaved draft) right away, then update it.
    const cache = store.json("cache");
    if (cache?.repo === repo && cache.report) {
      state.base = parseSettings(cache.settings);
      state.magazines = parseMagazines(cache.magazines);
      state.settings = draft?.repo === repo ? mergeSettings(draft.base, draft.settings, state.base) : clone(state.base);
      renderReport(cache.report);
      changed();
      notify(`Showing the copy from ${when(cache.at)}. Updating…`);
    } else app.innerHTML = `<p class="message">Loading…</p>`;
  }
  try {
    const [report, settingsFile, run, magazinesFile] = await Promise.all([
      getFile(REPORT_PATH), getFile(SETTINGS_PATH), getLastRun().catch(() => state.lastRun),
      getFile(MAGAZINES_PATH).catch(() => undefined)]);
    const remote = parseSettings(settingsFile?.text);
    // Keep edits made so far (on this page or in a draft from an earlier visit) on top of the latest settings.
    const [from, to] = state.base && state.settings ? [state.base, state.settings]
      : draft?.repo === repo ? [draft.base, draft.settings] : [remote, remote];
    state.settings = mergeSettings(from, to, remote);
    state.base = remote;
    state.settingsSha = settingsFile?.sha;
    state.lastRun = run;
    if (magazinesFile !== undefined) state.magazines = parseMagazines(magazinesFile?.text);  // keep the old copy on errors
    state.fetchedAt = Date.now();
    store.setJson("cache", { repo, report: report?.text ?? null, settings: settingsFile?.text ?? null,
                             magazines: state.magazines && JSON.stringify(state.magazines), at: state.fetchedAt });
    renderMagazines();
    if (!report) {
      state.reportText = "";
      state.reportMeta = null;
      app.innerHTML = toolbar() + `<p class="message">No status page yet. It appears after the next daily run, or start one with “Run now” in the ☰ menu.</p>`;
      bindToolbar();
    } else renderReport(report.text);
    changed();
    if (!state.polling && state.lastRun && state.lastRun.status !== "completed") {
      const id = state.lastRun.id;
      pollRun(async () => (await gh(`/actions/runs/${id}`)).json());
    }
  } catch (e) {
    if (/GitHub 401|GitHub 403/.test(e.message)) return setupView("The token was not accepted: " + e.message);
    if (state.reportText) return notify(`Couldn't update: ${e.message}`, true);
    app.innerHTML = toolbar() + `<p class="message error">${escapeHtml(e.message)}</p>`;
    bindToolbar();
  }
}
