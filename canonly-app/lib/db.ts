// Data layer on Node's built-in sqlite (zero native deps).
// Swap target for production: Postgres (Neon) behind this same interface.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export type Role = "admin" | "marketing" | "legal";
export type ClaimStatus = "draft" | "in_review" | "approved" | "retired";
export type BlockStatus = "draft" | "in_review" | "approved";
export type PageStatus = "draft" | "published";

export interface Org { id: string; name: string; slug: string }
export interface User { id: string; org_id: string; email: string; name: string; password_hash: string; role: Role }
export interface Claim {
  id: string; org_id: string; title: string; text: string;
  variants: string; // JSON string[]
  substantiation_url: string | null; substantiation_note: string | null;
  requires_pairing_claim_id: string | null;
  expires_at: string | null; // ISO date
  status: ClaimStatus; owner_id: string | null;
  created_at: string; updated_at: string;
}
export type Segment = { type: "claim"; claimId: string; variantIndex: number } | { type: "text"; text: string };
export interface Block {
  id: string; org_id: string; question: string;
  segments: string; // JSON Segment[]
  status: BlockStatus; review_reason: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}
export interface PageRow {
  id: string; org_id: string; slug: string; title: string;
  block_ids: string; // JSON string[]
  status: PageStatus; published_at: string | null;
}
export interface AuditEvent {
  id: number; org_id: string; actor_label: string; entity_type: string;
  entity_id: string; action: string; detail: string | null; created_at: string;
}
export interface Prompt { id: string; org_id: string; text: string; created_at: string }
export interface Sample {
  id: number; prompt_id: string; engine: string; mode: string;
  cited: number; cited_url: string | null; note: string | null; ran_at: string;
}

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "canonly.db");

declare global {
  // eslint-disable-next-line no-var
  var __canonlyDb: DatabaseSync | undefined;
}

function init(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS orgs (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, text TEXT NOT NULL,
      variants TEXT NOT NULL DEFAULT '[]',
      substantiation_url TEXT, substantiation_note TEXT,
      requires_pairing_claim_id TEXT,
      expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      owner_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, question TEXT NOT NULL,
      segments TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      review_reason TEXT,
      created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, slug TEXT NOT NULL,
      title TEXT NOT NULL, block_ids TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft', published_at TEXT,
      UNIQUE(org_id, slug)
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id TEXT NOT NULL, actor_label TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      action TEXT NOT NULL, detail TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id TEXT NOT NULL, engine TEXT NOT NULL, mode TEXT NOT NULL,
      cited INTEGER NOT NULL, cited_url TEXT, note TEXT, ran_at TEXT NOT NULL
    );
  `);
}

export function getDb(): DatabaseSync {
  if (!globalThis.__canonlyDb) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    init(db);
    globalThis.__canonlyDb = db;
    // Seed on first boot (idempotent).
    const { seedIfEmpty } = require("./seed") as typeof import("./seed");
    seedIfEmpty(db);
  }
  return globalThis.__canonlyDb;
}

export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();

// ---- typed helpers ----
export function one<T>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}
export function all<T>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}
export function run(sql: string, ...params: unknown[]) {
  return getDb().prepare(sql).run(...(params as never[]));
}

export function audit(orgId: string, actorLabel: string, entityType: string, entityId: string, action: string, detail?: object) {
  run(
    `INSERT INTO audit_events (org_id, actor_label, entity_type, entity_id, action, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    orgId, actorLabel, entityType, entityId, action, detail ? JSON.stringify(detail) : null, now()
  );
}

export function claimIsExpired(c: Pick<Claim, "expires_at">, at = new Date()): boolean {
  return !!c.expires_at && new Date(c.expires_at) <= at;
}
