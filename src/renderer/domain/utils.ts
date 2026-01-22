export function nowISO() {
  return new Date().toISOString();
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
