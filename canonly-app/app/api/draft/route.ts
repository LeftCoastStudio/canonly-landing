import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/db";
import { draftBlock } from "@/lib/draft";

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof Response) return s;
  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) return NextResponse.json({ error: "question required" }, { status: 400 });
  const draft = await draftBlock(s.org, question.trim());
  audit(s.org, s.name, "draft", "composer", "draft.generated", { mode: draft.mode, segments: draft.segments.length });
  return NextResponse.json(draft);
}
