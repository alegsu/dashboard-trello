import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { parse } from 'csv-parse/sync';

export async function POST(request) {
  try {
    let { csvUrl } = await request.json();
    if (!csvUrl) return NextResponse.json({ error: 'URL CSV mancante' }, { status: 400 });

    // Auto-conversione dell'URL standard nel formato CSV da esportare
    if (csvUrl.includes('/edit')) {
      const urlObj = new URL(csvUrl);
      const gid = urlObj.searchParams.get('gid') || '0';
      csvUrl = csvUrl.split('/edit')[0] + `/export?format=csv&gid=${gid}`;
    }

    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error('Impossibile scaricare il file CSV. Assicurati che sia condiviso o pubblico.');
    
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
      // Intestazioni: CLIENTI, POST SOCIAL, [vuoto/impegno], STORIE, SHOOTING, NEWSLETTER, BLOG POST, SITO WEB, ADV
      const clientName = record['CLIENTI'] || record['Clienti'];
      if (!clientName || clientName.trim() === '') continue;

      // Estraiamo tutti i collaboratori da tutte le colonne (escludendo CLIENTI e la % di impegno)
      const serviceCols = ['POST SOCIAL', 'STORIE', 'SHOOTING', 'NEWSLETTER', 'BLOG POST', 'SITO WEB ', 'SITO WEB', 'ADV'];
      const rawNames = new Set();
      const servicesSold = [];
      const rawEffort = record[''] || record['% Impegno'] || record[Object.keys(record)[2]]; // di solito la terza colonna

      for (const col of serviceCols) {
        const val = record[col];
        if (val && val.toUpperCase() !== 'NO' && val.trim() !== '') {
          servicesSold.push(col.trim());
          const names = val.split(',').map(n => n.trim().replace('?', ''));
          for (const n of names) {
            if (n && n !== 'NO') rawNames.add(n.toUpperCase());
          }
        }
      }

      // Creiamo gli utenti se non esistono
      const clientCollaborators = [];
      for (const name of rawNames) {
        if (!allUsersMap[name]) {
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
          allUsersMap[name] = user;
        }
        clientCollaborators.push({ id: allUsersMap[name].id });
      }

      // Costruiamo i dati del foglio come JSON
      const sheetDataObj = {
        effort: rawEffort || '',
        services: servicesSold
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

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Sheets Sync Error:", error);
    return NextResponse.json({ error: 'Errore durante la sincronizzazione: ' + error.message, stack: error.stack }, { status: 500 });
  }
}
