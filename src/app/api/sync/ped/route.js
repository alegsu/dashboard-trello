import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { parse } from 'csv-parse/sync';

async function fetchAndParsePedSheet(csvUrl) {
  if (csvUrl.includes('/edit')) {
    const urlObj = new URL(csvUrl);
    const gid = urlObj.searchParams.get('gid') || '0';
    csvUrl = csvUrl.split('/edit')[0] + `/export?format=csv&gid=${gid}`;
  }

  const res = await fetch(csvUrl, { cache: 'no-store', headers: { 'Accept': 'text/csv' } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}. Dettagli: ${text.substring(0, 100)}`);
  }
  
  const csvData = await res.text();
  const rows = parse(csvData, { skip_empty_lines: true, trim: true });
  return rows;
}

export async function syncClientPedForMonth(clientId, monthKey, sheetUrl) {
  // monthKey is "YYYY-MM", e.g. "2026-07"
  const [targetYearStr, targetMonthStr] = monthKey.split('-');
  const targetYear = parseInt(targetYearStr, 10);
  const targetMonth = parseInt(targetMonthStr, 10) - 1; // 0-indexed for Date

  const rows = await fetchAndParsePedSheet(sheetUrl);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { collaborators: true }
  });

  if (!client) throw new Error('Cliente non trovato');

  const networks = [
    { label: 'STORIES', key: 'Stories' },
    { label: 'LINKEDIN', key: 'Linkedin' },
    { label: 'IG/FB', key: 'IG/FB' },
    { label: 'TIK TOK', key: 'TikTok' },
    { label: 'TIKTOK', key: 'TikTok' },
    { label: 'BLOG E DEM', key: 'BLOG e DEM' },
  ];

  let state = "PREV"; // PREV, CURRENT, NEXT
  let lastDaySeen = 0;
  
  let postsData = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    
    // Check if this is a "Days" row
    let isDaysRow = false;
    if (row.length >= 8) {
       const nums = row.slice(1, 8).map(x => parseInt(x, 10)).filter(x => !isNaN(x) && x >= 1 && x <= 31);
       if (nums.length >= 4) {
          isDaysRow = true;
       }
    }

    if (isDaysRow) {
        let nextRows = [];
        let nextIdx = r + 1;
        while (nextIdx < rows.length) {
            const checkRow = rows[nextIdx];
            if (checkRow.length >= 8) {
                const nums = checkRow.slice(1, 8).map(x => parseInt(x, 10)).filter(x => !isNaN(x) && x >= 1 && x <= 31);
                if (nums.length >= 4) break; 
            }
            nextRows.push(checkRow);
            nextIdx++;
        }
        
        for (let c = 1; c <= 7; c++) {
            const dayStr = row[c];
            if (!dayStr) continue;
            const dayNum = parseInt(dayStr, 10);
            if (isNaN(dayNum)) continue;
            
            // Determine exact date
            if (state === "PREV") {
              if (dayNum === 1) state = "CURRENT";
            } else if (state === "CURRENT") {
              if (dayNum === 1 && lastDaySeen >= 28) state = "NEXT";
            }

            let m = targetMonth;
            let y = targetYear;
            if (state === "PREV") { m = targetMonth - 1; }
            else if (state === "NEXT") { m = targetMonth + 1; }
            
            // Fix year wraparound
            if (m < 0) { m = 11; y--; }
            if (m > 11) { m = 0; y++; }

            const dateObj = new Date(Date.UTC(y, m, dayNum, 12, 0, 0)); 
            lastDaySeen = dayNum;

            // Find Contenuto
            let contenuto = "";
            for (const nr of nextRows) {
              const label = (nr[0] || "").trim().toUpperCase();
              if (label.includes("CONTENUTO") && nr[c]) {
                 contenuto = nr[c].trim();
                 break;
              }
            }

            const ignoredLabels = ['EVENTI', 'TOPIC', 'FOTO', 'CONTENUTO', 'NOTE', 'STATUS'];

            for (let i = 0; i < nextRows.length; i++) {
                let rowLabel = (nextRows[i][0] || "").trim().toUpperCase();
                // Pulizia label da eventuali numeri o roba strana se necessario, ma di solito è "Social", "Linkedin" ecc.
                if (!rowLabel || ignoredLabels.some(ig => rowLabel.includes(ig)) || rowLabel.match(/^[0-9]/)) continue;
                
                // Trovata una riga potenziale di Social (es. Social, Linkedin, Stories, TikTok)
                const typeText = (nextRows[i][c] || "").trim();
                
                if (typeText && typeText.toUpperCase() !== "NO" && typeText !== "") {
                    let statusText = "TODO";
                    if (i + 1 < nextRows.length) {
                        const nextLabel = (nextRows[i+1][0] || "").trim().toUpperCase();
                        if (nextLabel.includes("STATUS")) {
                            statusText = (nextRows[i+1][c] || "").trim().toUpperCase();
                        }
                    }
                    
                    let dbStatus = "TODO";
                    if (statusText.includes("PROGRAMMATO")) dbStatus = "SCHEDULED";
                    else if (statusText.includes("APPROVAZIONE")) dbStatus = "APPROVAL";
                    else if (statusText.includes("BOZZA PRONTA")) dbStatus = "DRAFT";
                    else if (statusText.includes("SALTATO")) dbStatus = "SKIPPED";
                    
                    // Determina il network dal label o dal contenuto
                    let network = "IG/FB";
                    if (rowLabel.includes("LINKEDIN")) network = "Linkedin";
                    else if (rowLabel.includes("STORIES")) network = "Stories";
                    else if (rowLabel.includes("TIK") || rowLabel.includes("TOK") || typeText.toUpperCase().includes("TIK")) network = "TikTok";
                    else if (rowLabel.includes("BLOG") || rowLabel.includes("DEM")) network = "BLOG e DEM";
                    else if (rowLabel.includes("SOCIAL")) {
                       if (typeText.toUpperCase().includes("TIK")) network = "TikTok";
                       else if (typeText.toUpperCase().includes("LINKEDIN")) network = "Linkedin";
                       else network = "IG/FB";
                    } else if (rowLabel.includes("IG") || rowLabel.includes("FB")) {
                       network = "IG/FB";
                    }

                    postsData.push({
                         date: dateObj,
                         network: network,
                         type: typeText,
                         notes: contenuto,
                         status: dbStatus
                    });
                }
            }
        }
    }
  }

  // Now UPSERT into DB
  let syncedCount = 0;
  
  for (const post of postsData) {
    // Find existing
    const startOfDay = new Date(post.date);
    startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(post.date);
    endOfDay.setUTCHours(23,59,59,999);

    const existing = await prisma.socialPost.findFirst({
      where: {
        clientId: clientId,
        network: post.network,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existing) {
      await prisma.socialPost.update({
        where: { id: existing.id },
        data: {
          type: post.type,
          notes: post.notes,
          status: post.status
        }
      });
    } else {
      await prisma.socialPost.create({
        data: {
          date: post.date,
          type: post.type,
          network: post.network,
          clientId: clientId,
          notes: post.notes,
          status: post.status,
          assignees: {
            connect: client.collaborators.map(c => ({ id: c.id }))
          }
        }
      });
    }
    syncedCount++;
  }

  return syncedCount;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { clientId, monthKey, sheetUrl } = body;
    
    if (clientId && monthKey && sheetUrl) {
      // Sync a specific client/month
      const syncedCount = await syncClientPedForMonth(clientId, monthKey, sheetUrl);
      return NextResponse.json({ success: true, syncedCount });
    } else {
      // Sync ALL clients and ALL their pedSheets
      const clients = await prisma.client.findMany({
        where: { pedSheets: { not: null } }
      });
      
      let totalSynced = 0;
      for (const client of clients) {
        if (!client.pedSheets) continue;
        
        let sheets;
        try {
           sheets = JSON.parse(client.pedSheets);
        } catch { continue; }
        
        // Find current and next month keys
        const now = new Date();
        const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
        
        if (sheets[currentKey]) {
          try {
            totalSynced += await syncClientPedForMonth(client.id, currentKey, sheets[currentKey]);
          } catch(e) { console.error(`Failed to sync ${client.name} ${currentKey}:`, e.message); }
        }
        
        if (sheets[nextKey]) {
          try {
             totalSynced += await syncClientPedForMonth(client.id, nextKey, sheets[nextKey]);
          } catch(e) { console.error(`Failed to sync ${client.name} ${nextKey}:`, e.message); }
        }
      }
      return NextResponse.json({ success: true, syncedCount: totalSynced });
    }
  } catch (error) {
    console.error("PED Sync Error:", error);
    return NextResponse.json({ error: 'Errore durante la sincronizzazione PED: ' + error.message, stack: error.stack }, { status: 500 });
  }
}
