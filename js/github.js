// GitHub API
import { SETTINGS_PATH, WORKFLOW } from "./config.js";
import { mergeSettings, parseSettings } from "./settings.js";
import { state } from "./state.js";
import { store } from "./store.js";

export function cfg() { return { repo: store.get("repo"), token: store.get("token") }; }

export async function gh(path, opts = {}) {
  const { repo, token } = cfg();
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
               "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok && res.status !== 404) {
    const msg = (await res.json().catch(() => ({}))).message || res.statusText;
    throw new Error(`GitHub ${res.status}: ${msg}`);
  }
  return res;
}

const b64decode = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), c => c.charCodeAt(0)));
const b64encode = s => { let bin = ""; new TextEncoder().encode(s).forEach(b => bin += String.fromCharCode(b)); return btoa(bin); };

export async function getFile(path) {
  const res = await gh(`/contents/${path}?ref=main`);
  if (res.status === 404) return null;
  const j = await res.json();
  return { text: b64decode(j.content), sha: j.sha };
}

export async function getLastRun() {
  const res = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=1`);
  return res.status === 404 ? null : (await res.json()).workflow_runs?.[0] || null;
}

// Returns true when the file had changed on GitHub and our edits were merged onto the newer version.
export async function putSettings() {
  const send = () => gh(`/contents/${SETTINGS_PATH}`, { method: "PUT", body: JSON.stringify({
    message: "Update settings from phone app", content: b64encode(JSON.stringify(state.settings, null, 2) + "\n"),
    branch: "main", ...(state.settingsSha ? { sha: state.settingsSha } : {}) }) });
  let res, merged = false;
  try { res = await send(); }
  catch (e) {
    // Someone (e.g. the daily run) changed the file meanwhile: apply our edits on top of the latest version.
    if (!/GitHub 409|GitHub 422/.test(e.message)) throw e;
    const latest = await getFile(SETTINGS_PATH), remote = parseSettings(latest?.text);
    state.settings = mergeSettings(state.base, state.settings, remote);
    state.base = remote; state.settingsSha = latest?.sha; merged = true;
    res = await send();
  }
  state.settingsSha = (await res.json()).content.sha;
  return merged;
}
