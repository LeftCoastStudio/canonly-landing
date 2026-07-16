import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/db";
import { runSampler } from "@/lib/sampler";

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof Response) return s;
  const n = await runSampler(s.org, 5);
  audit(s.org, s.name, "sampler", "panel", "sampler.ran", { samples: n });
  return NextResponse.redirect(new URL(`/citations?ran=${n}`, req.url), 303);
}
