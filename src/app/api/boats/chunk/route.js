import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { extractTextFromPdfBuffer, extractBoatMetadataWithAI } from '@/utils/boats-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const { uploadId, chunkIndex, totalChunks, fileName, fileSize, base64Chunk } = body;

    if (!uploadId || chunkIndex === undefined || !totalChunks || !base64Chunk) {
      return NextResponse.json({ error: 'Dati del blocco incompleti' }, { status: 400 });
    }

    // 1. Salva il blocco corrente nel database
    await prisma.boatUploadChunk.create({
      data: {
        uploadId,
        chunkIndex,
        data: base64Chunk
      }
    });

    // Se non è l'ultimo blocco, rispondi con successo immediato
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({
        success: true,
        progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
        completed: false
      });
    }

    // 2. Ultimo blocco: Ricostruisci l'intero file recuperando tutti i blocchi ordinati
    console.log(`[Boats Chunk] Ricostruzione file "${fileName}" da ${totalChunks} blocchi...`);
    const allChunks = await prisma.boatUploadChunk.findMany({
      where: { uploadId },
      orderBy: { chunkIndex: 'asc' }
    });

    const fullBase64 = allChunks.map(c => c.data).join('');
    const fullBuffer = Buffer.from(fullBase64, 'base64');
    console.log(`[Boats Chunk] Buffer ricostruito: ${fullBuffer.length} bytes`);

    // 3. Estrazione testo con unpdf
    console.log(`[Boats Chunk] Estrazione testo PDF da "${fileName}"...`);
    let pdfText = '';
    try {
      pdfText = await extractTextFromPdfBuffer(fullBuffer);
    } catch (e) {
      console.warn('[Boats Chunk] Errore estrazione testo:', e.message);
    }

    // 4. Analisi metadati con OpenAI
    console.log(`[Boats Chunk] Analisi caratteristiche con AI...`);
    let metadata = {};
    try {
      metadata = await extractBoatMetadataWithAI(pdfText, fileName);
    } catch (e) {
      console.warn('[Boats Chunk] Errore AI metadati:', e.message);
      metadata = {
        title: (fileName || 'Scheda Barca').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        description: pdfText.slice(0, 500) || 'Scheda barca disponibile.'
      };
    }

    // 5. Salva la scheda barca nel database
    const fileUrl = `data:application/pdf;base64,${fullBase64.slice(0, 50)}`;
    const createdBoat = await prisma.boatSheet.create({
      data: {
        title: metadata.title || fileName.replace(/\.[^/.]+$/, ''),
        model: metadata.model || null,
        manufacturer: metadata.manufacturer || null,
        year: metadata.year || null,
        length: metadata.length || null,
        cabins: metadata.cabins || null,
        baths: metadata.baths || null,
        engines: metadata.engines || null,
        price: metadata.price || 'Su richiesta',
        description: metadata.description || 'Scheda tecnica disponibile.',
        features: metadata.features || null,
        fileUrl: fileUrl,
        fileDataBase64: fullBase64,
        fileName: fileName,
        fileSize: fileSize || fullBuffer.length,
        mimeType: 'application/pdf',
        isActive: true
      }
    });

    // 6. Pulisci i blocchi temporanei
    await prisma.boatUploadChunk.deleteMany({
      where: { uploadId }
    }).catch(() => {});

    console.log(`[Boats Chunk] ✅ Scheda barca creata con successo: ${createdBoat.title} (ID: ${createdBoat.id})`);
    return NextResponse.json(createdBoat, { status: 201 });
  } catch (error) {
    console.error('[Boats Chunk API] Errore:', error);
    return NextResponse.json({ error: error.message || 'Errore elaborazione blocco' }, { status: 500 });
  }
}
