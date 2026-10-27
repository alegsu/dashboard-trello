import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { get } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const boat = await prisma.boatSheet.findUnique({ where: { id } });

    if (!boat) {
      return NextResponse.json({ error: 'Scheda barca non trovata' }, { status: 404 });
    }

    const fileName = encodeURIComponent(boat.fileName || `${boat.title.replace(/\s+/g, '_')}.pdf`);

    // 1. Priorità massima: Se abbiamo il binario base64 salvato nel database
    if (boat.fileDataBase64 && boat.fileDataBase64.length > 100) {
      const buffer = Buffer.from(boat.fileDataBase64, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // 2. Se fileUrl contiene i dati base64 completi (es. data:application/pdf;base64,...)
    if (boat.fileUrl && boat.fileUrl.startsWith('data:application/pdf;base64,') && boat.fileUrl.length > 500) {
      const base64Data = boat.fileUrl.replace('data:application/pdf;base64,', '');
      const buffer = Buffer.from(base64Data, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // 3. Se il file è salvato su Vercel Blob
    if (boat.fileUrl && boat.fileUrl.includes('blob.vercel-storage.com')) {
      try {
        const result = await get(boat.fileUrl, { access: 'private' });
        return new NextResponse(result.stream, {
          headers: {
            'Content-Type': boat.mimeType || 'application/pdf',
            'Content-Disposition': `inline; filename="${fileName}"`,
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } catch (err) {
        console.warn('[Boats Download] Fallback get blob privato fallito, provo fetch diretta:', err.message);
      }
    }

    // 4. Se è un link Google Drive diretto
    if (boat.googleDriveId) {
      const gdriveUrl = `https://drive.google.com/uc?export=download&id=${boat.googleDriveId}`;
      try {
        const gRes = await fetch(gdriveUrl);
        if (gRes.ok) {
          const buffer = await gRes.arrayBuffer();
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${fileName}"`,
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      } catch (e) {
        console.warn('[Boats Download] Fetch Google Drive fallita:', e.message);
      }
      return NextResponse.redirect(gdriveUrl);
    }

    // 5. Se è un URL HTTP/HTTPS esterno
    if (boat.fileUrl && boat.fileUrl.startsWith('http')) {
      try {
        const extRes = await fetch(boat.fileUrl);
        if (extRes.ok) {
          const buffer = await extRes.arrayBuffer();
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': boat.mimeType || 'application/pdf',
              'Content-Disposition': `inline; filename="${fileName}"`,
              'Cache-Control': 'public, max-age=3600'
            }
          });
        }
      } catch (e) {
        console.warn('[Boats Download] Fetch URL esterno fallita, faccio redirect:', e.message);
      }
      return NextResponse.redirect(boat.fileUrl);
    }

    return NextResponse.json({ error: 'File non disponibile' }, { status: 404 });
  } catch (error) {
    console.error('[Boats Download] Errore:', error);
    return NextResponse.json({ error: 'Errore recupero file' }, { status: 500 });
  }
}
