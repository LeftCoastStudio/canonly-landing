import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { one, audit, type User } from "@/lib/db";
import { sign, COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  const user = one<User>("SELECT * FROM users WHERE email = ?", email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.redirect(new URL("/login?err=1", req.url), 303);
  }
  const token = sign({ uid: user.id, org: user.org_id, role: user.role, name: user.name });
  audit(user.org_id, user.name, "user", user.id, "user.signed_in");
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
