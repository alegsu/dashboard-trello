import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { del } from '@vercel/blob';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    // Trova l'allegato
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 });
    }

    // Se l'URL punta a vercel blob, lo eliminiamo fisicamente
    if (attachment.url.includes('public.blob.vercel-storage.com')) {
      try {
        await del(attachment.url);
      } catch (e) {
        console.error('Failed to delete blob:', e);
        // Procediamo comunque a rimuoverlo dal DB anche se c'è un errore su Vercel (es. già eliminato)
      }
    }

    // Elimina dal database
    await prisma.attachment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json({ error: 'Errore durante l\'eliminazione dell\'allegato' }, { status: 500 });
  }
}
