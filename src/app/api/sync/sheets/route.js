import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';

export async function syncGoogleSheets(csvUrl) {
  if (!csvUrl) throw new Error('URL CSV mancante');

  // Auto-conversione dell'URL standard nel formato CSV da esportare
  if (csvUrl.includes('/edit')) {
    const urlObj = new URL(csvUrl);
    let gid = null;
    if (urlObj.searchParams.has('gid')) {
        gid = urlObj.searchParams.get('gid');
    } else if (urlObj.hash && urlObj.hash.includes('gid=')) {
        gid = urlObj.hash.split('gid=')[1].split('&')[0];
    }
    csvUrl = csvUrl.split('/edit')[0] + `/export?format=csv`;
    if (gid) csvUrl += `&gid=${gid}`;
  }

  const res = await fetch(csvUrl, { cache: 'no-store', headers: { 'Accept': 'text/csv' } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}. Dettagli: ${text.substring(0, 100)}`);
  }
  
  const csvData = await res.text();
  
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const results = { clientsCreated: 0, clientsUpdated: 0, usersCreated: 0 };
  const allUsersMap = {};

  // Cache degli utenti esistenti
  const existingUsers = await prisma.user.findMany();
  existingUsers.forEach(u => {
    allUsersMap[u.name.toUpperCase()] = u;
  });

  const defaultPassword = await bcrypt.hash("Selv_281265", 10);

  for (const record of records) {
    const clientName = record['CLIENTI'] || record['Clienti'];
    if (!clientName || clientName.trim() === '') continue;

    const servicesDetails = {};
    const serviceCols = ['POST SOCIAL', 'STORIE', 'SHOOTING', 'NEWSLETTER', 'BLOG POST', 'SITO WEB ', 'SITO WEB', 'ADV'];
    const rawNames = new Set();
    const servicesSold = [];
    const rawEffort = record[''] || record['% Impegno'] || record[Object.keys(record)[2]]; // usually 3rd column

    const effortColName = Object.keys(record)[1]; // usually 'POST SOCIAL'
    const effortColValue = record[effortColName];
    let effortNames = [];
    let effortValues = [];
    if (effortColValue && effortColValue.toUpperCase() !== 'NO') {
      effortNames = effortColValue.split(',').map(n => n.trim().replace('?', '').toUpperCase());
    }
    if (rawEffort) {
      effortValues = rawEffort.split('-').map(e => e.trim());
    }

    for (const col of serviceCols) {
      const val = record[col];
      if (val && val.toUpperCase() !== 'NO' && val.trim() !== '') {
        const cleanColName = col.trim();
        servicesSold.push(cleanColName);
        
        const names = val.split(',').map(n => n.trim().replace('?', '').toUpperCase());
        const usersWithEffort = [];
        
        for (const n of names) {
          if (!n || n === 'NO') continue;
          rawNames.add(n);
          
          let userEffort = null;
          // Apply percentage ONLY if this is the effort column
          if (col === effortColName && effortValues.length > 0) {
            const eIdx = effortNames.indexOf(n);
            if (eIdx !== -1 && eIdx < effortValues.length) {
              userEffort = effortValues[eIdx];
            }
          }
          usersWithEffort.push({ name: n, effort: userEffort });
        }
        
        if (!servicesDetails[cleanColName]) {
          servicesDetails[cleanColName] = usersWithEffort;
        }
      }
    }

    // Creiamo gli utenti se non esistono
    const clientCollaborators = [];
    for (const name of rawNames) {
      if (!allUsersMap[name.toUpperCase()]) {
        const email = `${name.toLowerCase().replace(/\s+/g, '.')}@shinyup.it`;
        // Controlliamo se esiste per email
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: name, // Capitalize ideally, ma lasciamo il nome estratto
              email: email,
              passwordHash: defaultPassword,
              role: 'user'
            }
          });
          results.usersCreated++;
        }
        allUsersMap[name.toUpperCase()] = user;
      }
      clientCollaborators.push({ id: allUsersMap[name.toUpperCase()].id });
    }

    // Costruiamo i dati del foglio come JSON
    const sheetDataObj = {
      effort: rawEffort || '',
      services: servicesSold,
      servicesDetails
    };

    // Aggiorniamo o Creiamo il Cliente
    const existingClient = await prisma.client.findFirst({
      where: { name: { equals: clientName, mode: 'insensitive' } }
    });

    if (existingClient) {
      await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          sheetData: JSON.stringify(sheetDataObj),
          collaborators: {
            set: clientCollaborators // Sostituisce i collaboratori con quelli aggiornati
          }
        }
      });
      results.clientsUpdated++;
    } else {
      await prisma.client.create({
        data: {
          name: clientName,
          sheetData: JSON.stringify(sheetDataObj),
          collaborators: {
            connect: clientCollaborators
          }
        }
      });
      results.clientsCreated++;
    }
  }

  return results;
}

export async function POST(request) {
  try {
    const { csvUrl } = await request.json();
    const results = await syncGoogleSheets(csvUrl);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Sheets Sync Error:", error);
    return NextResponse.json({ error: 'Errore durante la sincronizzazione: ' + error.message, stack: error.stack }, { status: 500 });
  }
}
