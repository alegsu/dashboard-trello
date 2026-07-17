import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/utils/auth';
import { processMentions } from '@/utils/mentions';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    const session = await decrypt(sessionToken);

    const { text, cardId, socialPostId } = await request.json();
    if (!text || (!cardId && !socialPostId)) return NextResponse.json({ error: 'Text and cardId or socialPostId required' }, { status: 400 });

    const newComment = await prisma.comment.create({
      data: { 
        text, 
        authorId: session.id,
        ...(cardId ? { cardId } : {}),
        ...(socialPostId ? { socialPostId } : {})
      },
      include: { author: true, card: true, socialPost: true }
    });

    // Notifiche Mentions
    const link = `/?card=${cardId}`;
    await processMentions(text, session.id, link, `Commento indipendente o su progetto`);

    // I messaggi di notifica sono già inviati da processMentions

    return NextResponse.json(newComment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating comment' }, { status: 500 });
  }
}
