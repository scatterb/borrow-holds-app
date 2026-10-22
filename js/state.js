// State shared by the modules. One object, since modules can't reassign each other's variables.
export const app = document.getElementById("app");
export const state = {
  // base: settings.json as last read from GitHub; settings: the same with the user's edits.
  reportText: null, base: null, settings: null, settingsSha: undefined, dirty: false,
  polling: null, busy: false, fetchedAt: 0, lastRun: null,
  reportMeta: null,  // {at, mode} from the status page's "Updated 22.10.2026 09:11 · changes applied"
  magazines: null,  // data/magazines.json: {updated, issues: [{name, title, issue, borrowed, record}]}
};
