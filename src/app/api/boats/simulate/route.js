import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { processBoatAssistantQuery } from '@/utils/boats-ai';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { message, senderName = 'Alessandro', senderPhone = '+39 391 351 4685' } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 });
    }

    const boatSheets = await prisma.boatSheet.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    const aiResult = await processBoatAssistantQuery({
      userMessage: message,
      senderName,
      senderPhone,
      boatSheets
    });

    let boatToSend = null;
    if (aiResult.sendAttachment && aiResult.boatIdToSend) {
      boatToSend = await prisma.boatSheet.findUnique({
        where: { id: aiResult.boatIdToSend }
      });
    }

    return NextResponse.json({
      replyMessage: aiResult.replyMessage,
      sendAttachment: Boolean(aiResult.sendAttachment),
      boat: boatToSend
    });
  } catch (error) {
    console.error('[Boats Simulate API] Errore:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
