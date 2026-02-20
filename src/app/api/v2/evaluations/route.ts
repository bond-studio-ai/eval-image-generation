import { db } from '@/db/V2';
import { resultEvaluation } from '@/db/V2/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();

  const { resultId, productAccuracy, sceneAccuracyIssues, sceneAccuracyNotes } = body;

  if (!resultId) {
    return NextResponse.json({ error: 'resultId required' }, { status: 400 });
  }

  await db.insert(resultEvaluation).values({
    resultId,
    productAccuracy,
    sceneAccuracyIssues,
    sceneAccuracyNotes,
  });

  return NextResponse.json({ success: true });
}
