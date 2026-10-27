import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { put } from '@vercel/blob';
import { extractTextFromPdfBuffer, extractBoatMetadataWithAI } from '@/utils/boats-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const [boats, settings] = await Promise.all([
      prisma.boatSheet.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'BOAT_AI_ENABLED',
              'BOAT_AI_TEST_PHONES',
              'BOAT_AI_GOOGLE_DRIVE_FOLDER_URL',
              'BOAT_AI_GOOGLE_API_KEY'
            ]
          }
        }
      })
    ]);

    const settingMap = {};
    settings.forEach(s => { settingMap[s.key] = s.value; });

    return NextResponse.json({
      boats,
      settings: {
        enabled: settingMap.BOAT_AI_ENABLED === 'true',
        testPhones: settingMap.BOAT_AI_TEST_PHONES || '',
        driveFolderUrl: settingMap.BOAT_AI_GOOGLE_DRIVE_FOLDER_URL || '',
        driveApiKey: settingMap.BOAT_AI_GOOGLE_API_KEY || ''
      }
    });
  } catch (error) {
    console.error('[Boats API] Errore GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Nessun file PDF fornito' }, { status: 400 });
    }

    const fileName = file.name || 'scheda_barca.pdf';
    const fileSize = file.size || 0;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Estrazione testo dal PDF
    console.log(`[Boats API] Estrazione testo PDF per "${fileName}"...`);
    const pdfText = await extractTextFromPdfBuffer(buffer);

    // 2. Analisi AI per estrarre le specifiche della barca
    console.log(`[Boats API] Analisi AI delle caratteristiche per "${fileName}"...`);
    const metadata = await extractBoatMetadataWithAI(pdfText, fileName);

    // 3. Salva file su Vercel Blob (se configurato) e conserva sempre il base64 in DB per consegna garantita
    const base64Data = buffer.toString('base64');
    let fileUrl = '';
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`boats/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`, buffer, {
          access: 'private',
          contentType: 'application/pdf'
        });
        fileUrl = blob.url;
      }
    } catch (blobErr) {
      console.warn('[Boats API] Errore salvataggio Blob, uso fallback DB:', blobErr.message);
    }

    if (!fileUrl) {
      fileUrl = `data:application/pdf;base64,${base64Data}`;
    }

    // 4. Salva nel database
    const createdBoat = await prisma.boatSheet.create({
      data: {
        title: metadata.title,
        model: metadata.model,
        manufacturer: metadata.manufacturer,
        year: metadata.year,
        length: metadata.length,
        cabins: metadata.cabins,
        baths: metadata.baths,
        engines: metadata.engines,
        price: metadata.price,
        description: metadata.description,
        features: metadata.features,
        fileUrl: fileUrl,
        fileDataBase64: base64Data,
        fileName: fileName,
        fileSize: fileSize,
        mimeType: 'application/pdf',
        isActive: true
      }
    });

    console.log(`[Boats API] ✅ Scheda barca creata con successo: ${createdBoat.title} (ID: ${createdBoat.id})`);
    return NextResponse.json(createdBoat, { status: 201 });
  } catch (error) {
    console.error('[Boats API] Errore creazione scheda barca:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
