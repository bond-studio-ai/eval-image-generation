import { db } from '@/db/V2';
import { promptVersion } from '@/db/V2/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  const prompts = await db.select().from(promptVersion);
  return NextResponse.json(prompts);
}

export async function POST(req: Request) {
  const body = await req.json();

  const {
    systemPrompt,
    userPrompt,
    name,
    description,
    model,
    outputType,
    aspectRatio,
    outputResolution,
    temperature,
  } = body;

  if (!systemPrompt || !userPrompt) {
    return NextResponse.json({ error: 'systemPrompt and userPrompt required' }, { status: 400 });
  }

  const [pv] = await db
    .insert(promptVersion)
    .values({
      systemPrompt,
      userPrompt,
      name,
      description,
      model,
      outputType,
      aspectRatio,
      outputResolution,
      temperature,
    })
    .returning();

  return NextResponse.json(pv);
}
