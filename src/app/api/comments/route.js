import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/utils/auth';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    const session = await decrypt(sessionToken);

    const { text, cardId } = await request.json();
    if (!text || !cardId) return NextResponse.json({ error: 'Text and cardId required' }, { status: 400 });

    const newComment = await prisma.comment.create({
      data: { text, cardId, authorId: session.id },
      include: { author: true }
    });
    return NextResponse.json(newComment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating comment' }, { status: 500 });
  }
}
