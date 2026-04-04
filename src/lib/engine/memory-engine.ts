// ─── In-Memory Data Engine ─────────────────────────────────────────────────
// Reactive, transactional in-memory database engine for the ERP system.
// Zero external dependencies. Fully typed with generics.

// ─── Types ─────────────────────────────────────────────────────────────────

export type Operator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "contains" | "startsWith" | "endsWith" | "regex";
export type SortDir = "asc" | "desc";
export type EventType = "create" | "update" | "delete" | "batch";
export type Listener<T> = (event: { type: EventType; data: T | T[]; timestamp: number }) => void;

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "object";
  validate?: (value: any, record: Partial<T>) => boolean;
  message?: string;
}

export interface IndexDef<T> { field: keyof T; unique?: boolean }

interface Snapshot<T> { data: Map<string, T>; indexes: Map<string, Map<any, Set<string>>> }

// ─── MemoryStore ───────────────────────────────────────────────────────────

export class MemoryStore<T extends Record<string, any>> {
  private data = new Map<string, T>();
  private indexes = new Map<string, Map<any, Set<string>>>();
  private indexDefs = new Map<string, IndexDef<T>>();
  private listeners = new Map<EventType, Set<Listener<T>>>();
  private history: { action: string; snapshot: string }[] = [];
  private historyPos = -1;
  private maxHistory = 50;
  private ttls = new Map<string, number>();
  private ttlTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private schema: ValidationRule<T>[] = [];
  private txSnapshot: Snapshot<T> | null = null;
  private idCounter = 0;

  constructor(schema?: ValidationRule<T>[]) {
    if (schema) this.schema = schema;
  }

  // ── Schema Validation ──
  private validate(record: Partial<T>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const rule of this.schema) {
      const val = record[rule.field];
      if (rule.required && (val === undefined || val === null || val === "")) {
        errors.push(rule.message || `${String(rule.field)} is required`);
      }
      if (val !== undefined && rule.type && typeof val !== rule.type) {
        errors.push(rule.message || `${String(rule.field)} must be ${rule.type}`);
      }
      if (val !== undefined && rule.validate && !rule.validate(val, record)) {
        errors.push(rule.message || `${String(rule.field)} failed validation`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // ── Indexing ──
  createIndex(field: keyof T, unique = false): void {
    const key = String(field);
    this.indexDefs.set(key, { field, unique });
    const idx = new Map<any, Set<string>>();
    for (const [id, record] of this.data) {
      const val = record[field];
      if (!idx.has(val)) idx.set(val, new Set());
      idx.get(val)!.add(id);
    }
    this.indexes.set(key, idx);
  }

  private updateIndex(id: string, record: T, remove = false): void {
    for (const [key, idx] of this.indexes) {
      const val = record[key as keyof T];
      if (remove) {
        idx.get(val)?.delete(id);
        if (idx.get(val)?.size === 0) idx.delete(val);
      } else {
        if (!idx.has(val)) idx.set(val, new Set());
        idx.get(val)!.add(id);
      }
    }
  }

  // ── Events ──
  on(event: EventType, listener: Listener<T>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  off(event: EventType, listener: Listener<T>): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(type: EventType, data: T | T[]): void {
    this.listeners.get(type)?.forEach(fn => fn({ type, data, timestamp: Date.now() }));
  }

  // ── History ──
  private pushHistory(action: string): void {
    const snap = JSON.stringify(Array.from(this.data.entries()));
    if (this.historyPos < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyPos + 1);
    }
    this.history.push({ action, snapshot: snap });
    if (this.history.length > this.maxHistory) this.history.shift();
    this.historyPos = this.history.length - 1;
  }

  undo(): boolean {
    if (this.historyPos <= 0) return false;
    this.historyPos--;
    const entries: [string, T][] = JSON.parse(this.history[this.historyPos].snapshot);
    this.data = new Map(entries);
    this.rebuildIndexes();
    return true;
  }

  redo(): boolean {
    if (this.historyPos >= this.history.length - 1) return false;
    this.historyPos++;
    const entries: [string, T][] = JSON.parse(this.history[this.historyPos].snapshot);
    this.data = new Map(entries);
    this.rebuildIndexes();
    return true;
  }

  private rebuildIndexes(): void {
    for (const [key, def] of this.indexDefs) {
      const idx = new Map<any, Set<string>>();
      for (const [id, record] of this.data) {
        const val = record[def.field];
        if (!idx.has(val)) idx.set(val, new Set());
        idx.get(val)!.add(id);
      }
      this.indexes.set(key, idx);
    }
  }

  // ── CRUD ──
  private genId(): string { return `rec_${++this.idCounter}_${Date.now()}`; }

  create(record: T, id?: string, ttl?: number): string {
    const { valid, errors } = this.validate(record);
    if (!valid) throw new Error(`Validation failed: ${errors.join(", ")}`);
    const recId = id || this.genId();
    if (this.data.has(recId)) throw new Error(`Record ${recId} already exists`);
    this.pushHistory("create");
    this.data.set(recId, { ...record });
    this.updateIndex(recId, record);
    if (ttl) this.setTTL(recId, ttl);
    this.emit("create", record);
    return recId;
  }

  read(id: string): T | undefined {
    return this.data.get(id) ? { ...this.data.get(id)! } : undefined;
  }

  readAll(): T[] { return Array.from(this.data.values()).map(r => ({ ...r })); }

  update(id: string, partial: Partial<T>): T {
    const existing = this.data.get(id);
    if (!existing) throw new Error(`Record ${id} not found`);
    const updated = { ...existing, ...partial };
    const { valid, errors } = this.validate(updated);
    if (!valid) throw new Error(`Validation failed: ${errors.join(", ")}`);
    this.pushHistory("update");
    this.updateIndex(id, existing, true);
    this.data.set(id, updated);
    this.updateIndex(id, updated);
    this.emit("update", updated);
    return { ...updated };
  }

  delete(id: string): boolean {
    const existing = this.data.get(id);
    if (!existing) return false;
    this.pushHistory("delete");
    this.updateIndex(id, existing, true);
    this.data.delete(id);
    this.clearTTL(id);
    this.emit("delete", existing);
    return true;
  }

  upsert(id: string, record: T, ttl?: number): T {
    if (this.data.has(id)) return this.update(id, record);
    this.create(record, id, ttl);
    return { ...record };
  }

  // ── Batch ──
  bulkCreate(records: T[]): string[] {
    this.pushHistory("bulkCreate");
    const ids = records.map(r => {
      const id = this.genId();
      this.data.set(id, { ...r });
      this.updateIndex(id, r);
      return id;
    });
    this.emit("batch", records);
    return ids;
  }

  bulkUpdate(updates: { id: string; data: Partial<T> }[]): T[] {
    this.pushHistory("bulkUpdate");
    return updates.map(u => {
      const existing = this.data.get(u.id);
      if (!existing) throw new Error(`Record ${u.id} not found`);
      const updated = { ...existing, ...u.data };
      this.updateIndex(u.id, existing, true);
      this.data.set(u.id, updated);
      this.updateIndex(u.id, updated);
      return { ...updated };
    });
  }

  bulkDelete(ids: string[]): number {
    this.pushHistory("bulkDelete");
    let count = 0;
    for (const id of ids) {
      const existing = this.data.get(id);
      if (existing) {
        this.updateIndex(id, existing, true);
        this.data.delete(id);
        this.clearTTL(id);
        count++;
      }
    }
    return count;
  }

  // ── Query ──
  filter(predicate: (record: T) => boolean): T[] {
    return this.readAll().filter(predicate);
  }

  findByIndex(field: keyof T, value: any): T[] {
    const idx = this.indexes.get(String(field));
    if (!idx) return this.filter(r => r[field] === value);
    const ids = idx.get(value);
    if (!ids) return [];
    return Array.from(ids).map(id => ({ ...this.data.get(id)! }));
  }

  sort(field: keyof T, dir: SortDir = "asc"): T[] {
    return this.readAll().sort((a, b) => {
      if (a[field] < b[field]) return dir === "asc" ? -1 : 1;
      if (a[field] > b[field]) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  paginate(skip: number, take: number): T[] {
    return this.readAll().slice(skip, skip + take);
  }

  search(query: string, fields?: (keyof T)[]): T[] {
    const q = query.toLowerCase();
    return this.readAll().filter(record => {
      const keys = fields || (Object.keys(record) as (keyof T)[]);
      return keys.some(k => {
        const v = record[k];
        return typeof v === "string" && v.toLowerCase().includes(q);
      });
    });
  }

  // ── Aggregations ──
  count(predicate?: (r: T) => boolean): number {
    return predicate ? this.filter(predicate).length : this.data.size;
  }

  sum(field: keyof T, predicate?: (r: T) => boolean): number {
    const records = predicate ? this.filter(predicate) : this.readAll();
    return records.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  }

  avg(field: keyof T, predicate?: (r: T) => boolean): number {
    const records = predicate ? this.filter(predicate) : this.readAll();
    if (records.length === 0) return 0;
    return this.sum(field, predicate) / records.length;
  }

  min(field: keyof T, predicate?: (r: T) => boolean): number {
    const records = predicate ? this.filter(predicate) : this.readAll();
    return Math.min(...records.map(r => Number(r[field]) || Infinity));
  }

  max(field: keyof T, predicate?: (r: T) => boolean): number {
    const records = predicate ? this.filter(predicate) : this.readAll();
    return Math.max(...records.map(r => Number(r[field]) || -Infinity));
  }

  groupBy(field: keyof T): Map<any, T[]> {
    const groups = new Map<any, T[]>();
    for (const record of this.readAll()) {
      const key = record[field];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(record);
    }
    return groups;
  }

  // ── Transactions ──
  begin(): void {
    this.txSnapshot = {
      data: new Map(Array.from(this.data.entries()).map(([k, v]) => [k, { ...v }])),
      indexes: new Map(),
    };
  }

  commit(): void { this.txSnapshot = null; }

  rollback(): void {
    if (!this.txSnapshot) throw new Error("No transaction in progress");
    this.data = this.txSnapshot.data;
    this.rebuildIndexes();
    this.txSnapshot = null;
  }

  // ── TTL ──
  private setTTL(id: string, ms: number): void {
    this.clearTTL(id);
    this.ttls.set(id, Date.now() + ms);
    this.ttlTimers.set(id, setTimeout(() => this.delete(id), ms));
  }

  private clearTTL(id: string): void {
    const timer = this.ttlTimers.get(id);
    if (timer) clearTimeout(timer);
    this.ttls.delete(id);
    this.ttlTimers.delete(id);
  }

  // ── Snapshot ──
  snapshot(): string { return JSON.stringify(Array.from(this.data.entries())); }

  restore(snap: string): void {
    const entries: [string, T][] = JSON.parse(snap);
    this.data = new Map(entries);
    this.rebuildIndexes();
  }

  // ── Import / Export ──
  exportJSON(): T[] { return this.readAll(); }

  importJSON(records: T[], clearFirst = false): string[] {
    if (clearFirst) this.data.clear();
    return this.bulkCreate(records);
  }

  // ── Stats ──
  get size(): number { return this.data.size; }

  stats(): { count: number; indexes: number; memoryEstimate: string } {
    const bytes = new TextEncoder().encode(JSON.stringify(this.readAll())).length;
    return {
      count: this.data.size,
      indexes: this.indexes.size,
      memoryEstimate: bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1048576).toFixed(1)}MB`,
    };
  }

  // ── Query Builder ──
  query(): QueryBuilder<T> { return new QueryBuilder<T>(this.readAll()); }

  clear(): void {
    this.pushHistory("clear");
    this.data.clear();
    this.rebuildIndexes();
  }
}

// ─── QueryBuilder ──────────────────────────────────────────────────────────

export class QueryBuilder<T extends Record<string, any>> {
  private records: T[];
  private conditions: ((r: T) => boolean)[] = [];
  private sortFields: { field: keyof T; dir: SortDir }[] = [];
  private selectFields: (keyof T)[] | null = null;
  private limitN: number | null = null;
  private offsetN = 0;
  private groupField: keyof T | null = null;
  private havingFn: ((group: T[]) => boolean) | null = null;

  constructor(records: T[]) { this.records = records; }

  where(fieldOrPred: keyof T | ((r: T) => boolean), op?: Operator, value?: any): this {
    if (typeof fieldOrPred === "function") {
      this.conditions.push(fieldOrPred as (r: T) => boolean);
      return this;
    }
    const field = fieldOrPred;
    this.conditions.push((r: T) => {
      const v = r[field];
      switch (op) {
        case "eq": return v === value;
        case "ne": return v !== value;
        case "gt": return v > value;
        case "gte": return v >= value;
        case "lt": return v < value;
        case "lte": return v <= value;
        case "in": return Array.isArray(value) && value.includes(v);
        case "nin": return Array.isArray(value) && !value.includes(v);
        case "contains": return typeof v === "string" && v.toLowerCase().includes(String(value).toLowerCase());
        case "startsWith": return typeof v === "string" && v.toLowerCase().startsWith(String(value).toLowerCase());
        case "endsWith": return typeof v === "string" && v.toLowerCase().endsWith(String(value).toLowerCase());
        case "regex": return typeof v === "string" && new RegExp(String(value)).test(v);
        default: return v === op; // shorthand: where(field, value)
      }
    });
    return this;
  }

  orderBy(field: keyof T, dir: SortDir = "asc"): this {
    this.sortFields.push({ field, dir });
    return this;
  }

  select(...fields: (keyof T)[]): this { this.selectFields = fields; return this; }
  limit(n: number): this { this.limitN = n; return this; }
  offset(n: number): this { this.offsetN = n; return this; }

  groupByField(field: keyof T): this { this.groupField = field; return this; }

  having(predicate: (group: T[]) => boolean): this { this.havingFn = predicate; return this; }

  execute(): T[] {
    let result = [...this.records];
    for (const cond of this.conditions) result = result.filter(cond);
    for (const { field, dir } of this.sortFields) {
      result.sort((a, b) => {
        if (a[field] < b[field]) return dir === "asc" ? -1 : 1;
        if (a[field] > b[field]) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    result = result.slice(this.offsetN);
    if (this.limitN !== null) result = result.slice(0, this.limitN);
    if (this.selectFields) {
      result = result.map(r => {
        const picked: any = {};
        for (const f of this.selectFields!) picked[f] = r[f];
        return picked;
      });
    }
    return result;
  }

  count(): number { return this.execute().length; }
  first(): T | undefined { return this.limit(1).execute()[0]; }
  last(): T | undefined { const r = this.execute(); return r[r.length - 1]; }

  sum(field: keyof T): number {
    return this.execute().reduce((s, r) => s + (Number(r[field]) || 0), 0);
  }

  avg(field: keyof T): number {
    const rows = this.execute();
    if (rows.length === 0) return 0;
    return rows.reduce((s, r) => s + (Number(r[field]) || 0), 0) / rows.length;
  }
}

// ─── MemoryDatabase ────────────────────────────────────────────────────────

export class MemoryDatabase {
  private collections = new Map<string, MemoryStore<any>>();
  private globalListeners = new Map<string, Set<(event: any) => void>>();

  createCollection<T extends Record<string, any>>(name: string, schema?: ValidationRule<T>[]): MemoryStore<T> {
    if (this.collections.has(name)) throw new Error(`Collection "${name}" already exists`);
    const store = new MemoryStore<T>(schema);
    this.collections.set(name, store);
    return store;
  }

  getCollection<T extends Record<string, any>>(name: string): MemoryStore<T> {
    const col = this.collections.get(name);
    if (!col) throw new Error(`Collection "${name}" not found`);
    return col as MemoryStore<T>;
  }

  dropCollection(name: string): boolean {
    return this.collections.delete(name);
  }

  listCollections(): string[] { return Array.from(this.collections.keys()); }

  hasCollection(name: string): boolean { return this.collections.has(name); }

  onGlobal(event: string, listener: (data: any) => void): void {
    if (!this.globalListeners.has(event)) this.globalListeners.set(event, new Set());
    this.globalListeners.get(event)!.add(listener);
  }

  emitGlobal(event: string, data: any): void {
    this.globalListeners.get(event)?.forEach(fn => fn(data));
  }

  exportAll(): Record<string, any[]> {
    const dump: Record<string, any[]> = {};
    for (const [name, store] of this.collections) dump[name] = store.exportJSON();
    return dump;
  }

  importAll(dump: Record<string, any[]>): void {
    for (const [name, records] of Object.entries(dump)) {
      if (!this.collections.has(name)) this.createCollection(name);
      this.collections.get(name)!.importJSON(records, true);
    }
  }

  statistics(): { collections: number; totalRecords: number; details: Record<string, { count: number; memory: string }> } {
    const details: Record<string, { count: number; memory: string }> = {};
    let totalRecords = 0;
    for (const [name, store] of this.collections) {
      const s = store.stats();
      details[name] = { count: s.count, memory: s.memoryEstimate };
      totalRecords += s.count;
    }
    return { collections: this.collections.size, totalRecords, details };
  }

  clear(): void {
    for (const store of this.collections.values()) store.clear();
  }
}

// ─── Singleton Default Database ────────────────────────────────────────────

let defaultDb: MemoryDatabase | null = null;

export function getDatabase(): MemoryDatabase {
  if (!defaultDb) defaultDb = new MemoryDatabase();
  return defaultDb;
}

export function resetDatabase(): void {
  defaultDb = null;
}
