import type { SprintEvent } from './event';

export class InMemoryEventStore {
  private events: SprintEvent[] = [];

  append(e: SprintEvent) {
    this.events.push(e);
  }

  all() {
    return [...this.events];
  }

  within(fromISO: string, toISO: string) {
    const from = Date.parse(fromISO);
    const to = Date.parse(toISO);
    return this.events.filter((ev) => {
      const t = Date.parse(ev.ts);
      return t >= from && t <= to;
    });
  }
}
