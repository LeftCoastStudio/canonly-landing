import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { Role } from "./db";

const SECRET = process.env.SESSION_SECRET || "dev-secret-do-not-ship";
export const COOKIE = "canonly_session";

export interface Session { uid: string; org: string; role: Role; name: string; exp: number }

const b64u = (b: Buffer) => b.toString("base64url");

export function sign(payload: Omit<Session, "exp">, ttlHours = 24 * 7): string {
  const body = b64u(Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlHours * 3600_000 })));
  const mac = b64u(createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${mac}`;
}

export function verify(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    if (s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

/** Server components: current session or null. */
export function getSession(): Session | null {
  return verify(cookies().get(COOKIE)?.value);
}

/** Route handlers: throw-style guard. Returns session or a 401/403 Response. */
export function requireSession(req: NextRequest, roles?: Role[]): Session | Response {
  const s = verify(req.cookies.get(COOKIE)?.value);
  if (!s) return new Response("Unauthorized", { status: 401 });
  if (roles && !roles.includes(s.role) && s.role !== "admin") {
    return new Response("Forbidden: requires role " + roles.join("/"), { status: 403 });
  }
  return s;
}
