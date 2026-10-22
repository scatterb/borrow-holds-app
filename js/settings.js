// settings.json: parsing, merging and describing unsaved edits
import { state } from "./state.js";

const defaultSettings = () => ({ priority: {}, returning: [], paused_until: {}, noticed: [] });
export const parseSettings = text => Object.assign(defaultSettings(), text ? JSON.parse(text) : {});
export const clone = o => JSON.parse(JSON.stringify(o));
const keysOf = (...objs) => new Set(objs.flatMap(o => Object.keys(o || {})));

// Three-way merge: apply the edits that turned `from` into `to` on top of `onto`.
export function mergeSettings(from, to, onto) {
  const out = clone(onto);
  const mergeList = (a = [], b = [], c = []) => {
    const removed = a.filter(x => !b.includes(x));
    return [...c.filter(x => !removed.includes(x)), ...b.filter(x => !a.includes(x) && !c.includes(x))];
  };
  out.returning = mergeList(from.returning, to.returning, onto.returning);
  out.noticed = mergeList(from.noticed, to.noticed, onto.noticed);
  for (const cat of keysOf(from.priority, to.priority, onto.priority)) {
    const list = mergeList(from.priority[cat], to.priority[cat], onto.priority[cat]);
    list.length ? out.priority[cat] = list : delete out.priority[cat];
  }
  for (const cat of keysOf(from.paused_until, to.paused_until)) {
    const until = to.paused_until[cat];
    if (until === from.paused_until[cat]) continue;
    until ? out.paused_until[cat] = until : delete out.paused_until[cat];
  }
  for (const k of Object.keys(to))
    if (!(k in defaultSettings()) && JSON.stringify(from[k]) !== JSON.stringify(to[k])) out[k] = clone(to[k]);
  return out;
}

// Unsaved edits as short phrases, e.g. ["2 starred", "1 returning"].
export function changeSummary() {
  const { base, settings } = state;
  if (!base || !settings) return [];
  const diff = (a = [], b = []) => [b.filter(x => !a.includes(x)).length, a.filter(x => !b.includes(x)).length];
  let starred = 0, unstarred = 0, paused = 0, unpaused = 0;
  for (const cat of keysOf(base.priority, settings.priority)) {
    const [add, rem] = diff(base.priority[cat], settings.priority[cat]);
    starred += add; unstarred += rem;
  }
  const [returning, notReturning] = diff(base.returning, settings.returning);
  const [noticed, unnoticed] = diff(base.noticed, settings.noticed);
  for (const cat of keysOf(base.paused_until, settings.paused_until)) {
    const until = settings.paused_until[cat];
    if (until !== base.paused_until[cat]) until ? paused++ : unpaused++;
  }
  return [[starred, "starred"], [unstarred, "unstarred"], [returning, "returning"], [notReturning, "not returning"],
          [noticed, "noticed"], [unnoticed, "not noticed"],
          [paused, paused === 1 ? "pause" : "pauses"], [unpaused, unpaused === 1 ? "pause removed" : "pauses removed"]]
    .filter(([n]) => n).map(([n, text]) => `${n} ${text}`);
}
