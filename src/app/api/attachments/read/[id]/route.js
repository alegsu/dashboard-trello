import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { get } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    // Trova l'allegato
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 });
    }

    // Se l'URL è un Vercel Blob (pubblico o privato), usiamo l'SDK per scaricarlo
    if (attachment.url.includes('blob.vercel-storage.com')) {
      try {
        const result = await get(attachment.url, { access: 'private' });
        
        return new NextResponse(result.stream, {
          headers: {
            'Content-Type': result.blob.contentType || 'application/octet-stream',
            // Usa 'inline' per visualizzare nel browser (immagini/pdf), 'attachment' per forzare il download
            'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.name)}"`,
          }
        });
      } catch (e) {
        console.error('Error proxying blob:', e);
        return NextResponse.json({ 
           error: 'Errore durante la lettura del file', 
           details: e ? (e.stack || e.toString()) : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Per i normali link Google Drive esterni, facciamo un redirect diretto
    return NextResponse.redirect(attachment.url);

  } catch (error) {
    console.error('Error in attachment read API:', error);
    return NextResponse.json({ error: 'Errore generico' }, { status: 500 });
  }
}
