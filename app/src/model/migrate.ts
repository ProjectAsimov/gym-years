// One-time migration from the single-tracker "Gym years" app on this device.
import * as store from './store';
import { DAY_RE } from '../lib/dates';

const OLD_LOG = 'gymyears.log.v2';      // { "YYYY-MM-DD": { on, t } }
const OLD_DAYS = 'gymyears.days.v1';    // ["YYYY-MM-DD", ...]
const OLD_KEYS = [OLD_LOG, OLD_DAYS, 'gymyears.session', 'gymyears.theme', 'gymyears.accent', 'gymyears.syncon', 'gymyears.welcomed', 'gymyears.sync'];
const CARRY: Array<[string, string]> = [
  ['gymyears.session', 'tt.session'],
  ['gymyears.theme', 'tt.theme'],
  ['gymyears.accent', 'tt.accent'],
  ['gymyears.syncon', 'tt.syncon'],
  ['gymyears.welcomed', 'tt.welcomed'],
];

/** Returns true when a Gym task was created from legacy data. Must run before the store is used. */
export function migrateLegacy(): boolean {
  let created = false;
  try {
    for (const [from, to] of CARRY) {
      const v = localStorage.getItem(from);
      if (v !== null && localStorage.getItem(to) === null) localStorage.setItem(to, v);
    }
    const storeEmpty = !localStorage.getItem(store.STATE_KEY);
    const rawLog = localStorage.getItem(OLD_LOG);
    const rawDays = localStorage.getItem(OLD_DAYS);
    if (storeEmpty && (rawLog || rawDays)) {
      const log: Record<string, { on: number; t: number }> = {};
      if (rawLog) {
        const parsed = JSON.parse(rawLog) as Record<string, { on?: number; t?: number }>;
        for (const k in parsed) if (DAY_RE.test(k)) log[k] = { on: parsed[k]?.on ? 1 : 0, t: +(parsed[k]?.t ?? 0) || 0 };
      } else if (rawDays) {
        for (const d of JSON.parse(rawDays) as unknown[]) if (typeof d === 'string' && DAY_RE.test(d)) log[d] = { on: 1, t: 0 };
      }
      const task = store.addTask('Gym', 'purple', 'dumbbell');
      for (const day in log) store.setDay(task.id, day, !!log[day]!.on, log[day]!.t);
      store.legacyTaskId.value = task.id;
      store.save();
      created = true;
    }
    for (const k of OLD_KEYS) localStorage.removeItem(k);
  } catch {
    /* storage blocked or bad JSON: leave things be */
  }
  return created;
}
