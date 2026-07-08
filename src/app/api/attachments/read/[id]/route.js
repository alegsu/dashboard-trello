import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

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

    // Se l'URL è un Vercel Blob (pubblico o privato), lo proxyamo con il token per avere accesso garantito
    if (attachment.url.includes('blob.vercel-storage.com')) {
      try {
        const response = await fetch(attachment.url, {
          headers: {
            Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
        }

        return new NextResponse(response.body, {
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
            // Usa 'inline' per visualizzare nel browser (immagini/pdf), 'attachment' per forzare il download
            'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.name)}"`,
          }
        });
      } catch (e) {
        console.error('Error proxying blob:', e);
        return NextResponse.json({ error: 'Errore durante la lettura del file' }, { status: 500 });
      }
    }

    // Per i normali link Google Drive esterni, facciamo un redirect diretto
    return NextResponse.redirect(attachment.url);

  } catch (error) {
    console.error('Error in attachment read API:', error);
    return NextResponse.json({ error: 'Errore generico' }, { status: 500 });
  }
}
