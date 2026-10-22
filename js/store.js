// localStorage that never throws (private windows, blocked storage).
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
  json(k) { try { return JSON.parse(this.get(k)); } catch { return null; } },
  setJson(k, v) { this.set(k, JSON.stringify(v)); },
};
