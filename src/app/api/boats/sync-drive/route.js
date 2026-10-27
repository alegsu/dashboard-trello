import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { put } from '@vercel/blob';
import { extractTextFromPdfBuffer, extractBoatMetadataWithAI } from '@/utils/boats-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Estrae l'ID della cartella Google Drive da vari formati di URL
function extractGoogleDriveFolderId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  // Se è già un ID (es. alphanumeric lungo senza slash)
  if (!trimmed.includes('/') && trimmed.length >= 15) {
    return trimmed;
  }
  // Da URL formato: /folders/FOLDER_ID
  const folderMatch = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];

  // Da query param: id=FOLDER_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Recupera impostazioni dal database o dal body
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['BOAT_AI_GOOGLE_DRIVE_FOLDER_URL', 'BOAT_AI_GOOGLE_API_KEY'] }
      }
    });
    const settingMap = {};
    settings.forEach(s => { settingMap[s.key] = s.value; });

    const folderInput = body.driveFolderUrl || settingMap.BOAT_AI_GOOGLE_DRIVE_FOLDER_URL;
    const apiKey = body.driveApiKey || settingMap.BOAT_AI_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

    if (!folderInput) {
      return NextResponse.json({
        error: 'Inserisci il link o l\'ID della cartella Google Drive'
      }, { status: 400 });
    }

    const folderId = extractGoogleDriveFolderId(folderInput);
    if (!folderId) {
      return NextResponse.json({
        error: 'Formato link Google Drive non valido. Assicurati che contenga l\'ID della cartella (es. https://drive.google.com/drive/folders/ID_CARTELLA)'
      }, { status: 400 });
    }

    // Salva le impostazioni aggiornate
    await prisma.systemSetting.upsert({
      where: { key: 'BOAT_AI_GOOGLE_DRIVE_FOLDER_URL' },
      update: { value: folderInput.trim() },
      create: { key: 'BOAT_AI_GOOGLE_DRIVE_FOLDER_URL', value: folderInput.trim() }
    });

    if (apiKey) {
      await prisma.systemSetting.upsert({
        where: { key: 'BOAT_AI_GOOGLE_API_KEY' },
        update: { value: apiKey.trim() },
        create: { key: 'BOAT_AI_GOOGLE_API_KEY', value: apiKey.trim() }
      });
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        needApiKey: true,
        folderId,
        message: 'Per leggere automaticamente l\'elenco dei file all\'interno della cartella Google Drive serve una Google API Key. Inseriscila nelle impostazioni qui sotto, oppure carica i file PDF delle barche direttamente con il pulsante Carica PDF.'
      });
    }

    // 1. Chiamata a Google Drive API v3 per elencare i file nella cartella
    console.log(`[Sync Drive] Ricerca file nella cartella Google Drive ${folderId}...`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType,size,webContentLink,webViewLink)&pageSize=100`;

    const listRes = await fetch(listUrl);
    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error('[Sync Drive] Errore risposta Google Drive API:', errText);
      return NextResponse.json({
        error: `Errore Google Drive API: ${errText.slice(0, 200)}`
      }, { status: 500 });
    }

    const listData = await listRes.json();
    const driveFiles = listData.files || [];

    // Filtra per file PDF (o file con estensione .pdf)
    const pdfFiles = driveFiles.filter(f => 
      f.mimeType === 'application/pdf' || 
      (f.name && f.name.toLowerCase().endsWith('.pdf'))
    );

    if (pdfFiles.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        totalFound: driveFiles.length,
        message: `Trovati ${driveFiles.length} file nella cartella, ma nessun PDF di schede barca.`
      });
    }

    console.log(`[Sync Drive] Trovati ${pdfFiles.length} file PDF. Elaborazione in corso...`);
    const importedItems = [];

    for (const file of pdfFiles) {
      try {
        // Controlla se il file è già stato importato
        const existing = await prisma.boatSheet.findFirst({
          where: { googleDriveId: file.id }
        });

        if (existing) {
          console.log(`[Sync Drive] File "${file.name}" già presente in database, salto.`);
          importedItems.push({ id: existing.id, title: existing.title, status: 'already_exists' });
          continue;
        }

        // 2. Scarica il contenuto binario del PDF da Google Drive
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`;
        const fileRes = await fetch(downloadUrl);
        if (!fileRes.ok) {
          console.warn(`[Sync Drive] Impossibile scaricare ${file.name}: ${fileRes.status}`);
          continue;
        }

        const buffer = Buffer.from(await fileRes.arrayBuffer());

        // 3. Estrazione testo con unpdf
        const pdfText = await extractTextFromPdfBuffer(buffer);

        // 4. Analisi con OpenAI
        const metadata = await extractBoatMetadataWithAI(pdfText, file.name);

        // 5. Salva su Vercel Blob o usa link download diretto Drive
        let fileUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
        try {
          if (process.env.BLOB_READ_WRITE_TOKEN) {
            const blob = await put(`boats/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`, buffer, {
              access: 'private',
              contentType: 'application/pdf'
            });
            fileUrl = blob.url;
          }
        } catch (e) {
          console.warn('[Sync Drive] Salvataggio Blob fallito, uso URL Drive diretto');
        }

        // 6. Salvataggio nel database
        const created = await prisma.boatSheet.create({
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
            googleDriveId: file.id,
            fileName: file.name,
            fileSize: parseInt(file.size, 10) || buffer.length,
            mimeType: 'application/pdf',
            isActive: true
          }
        });

        importedItems.push({ id: created.id, title: created.title, status: 'imported' });
        console.log(`[Sync Drive] ✅ Importata barca: ${created.title}`);
      } catch (errFile) {
        console.error(`[Sync Drive] Errore elaborazione file ${file.name}:`, errFile);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedItems.filter(i => i.status === 'imported').length,
      totalPdfs: pdfFiles.length,
      items: importedItems
    });
  } catch (error) {
    console.error('[Sync Drive API] Errore generale:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
