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
      include: { author: true, card: true }
    });

    // Notifiche Mentions
    const allUsers = await prisma.user.findMany();
    const mentionedUsers = allUsers.filter(u => 
      text.toLowerCase().includes(`@${u.name.toLowerCase()}`) || 
      text.toLowerCase().includes(`@${u.name.split(' ')[0].toLowerCase()}`)
    );

    for (const u of mentionedUsers) {
      if (u.id !== session.id && u.notifyMentions !== false && u.email) {
        await prisma.pendingNotification.create({
          data: {
            userId: u.id,
            type: "MENTION",
            message: `${newComment.author.name} ti ha menzionato in un commento: "${text}"`,
            link: `/?card=${cardId}`
          }
        });
      }
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating comment' }, { status: 500 });
  }
}
