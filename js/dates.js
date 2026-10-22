export const pad = n => String(n).padStart(2, "0");
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const fi = d => `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const daysFrom = (a, b) => Math.round((b - a) / 86400000);
export function when(t) {
  const d = new Date(t), day = new Date(d); day.setHours(0, 0, 0, 0);
  const ago = daysFrom(day, today());
  return `${ago === 0 ? "today" : ago === 1 ? "yesterday" : `${d.getDate()}.${d.getMonth() + 1}.`} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
