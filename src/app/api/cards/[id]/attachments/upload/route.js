import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { put } from '@vercel/blob';

export async function POST(request, { params }) {
  try {
    const { id } = await params; // cardId
    
    // Controlla che la carta esista
    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: 'Scheda non trovata' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 });
    }

    // Carica il file su Vercel Blob (impostato su private per compatibilità con il tuo store)
    const blob = await put(`attachments/${id}/${file.name}`, file, {
      access: 'private',
    });

    // Salva nel database
    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        url: blob.url,
        cardId: id
      }
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error uploading file to blob:', error);
    return NextResponse.json({ error: error.message || 'Errore durante il caricamento del file' }, { status: 500 });
  }
}
