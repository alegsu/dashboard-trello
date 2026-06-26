const { parse } = require('csv-parse/sync');

async function main() {
  let csvUrl = 'https://docs.google.com/spreadsheets/d/1q5xwTVCXARCgUngp6u4RPs5jMGqkJct_/edit?gid=253487602#gid=253487602';
  if (csvUrl.includes('/edit')) {
    const urlObj = new URL(csvUrl);
    const gid = urlObj.searchParams.get('gid') || '0';
    csvUrl = csvUrl.split('/edit')[0] + `/export?format=csv&gid=${gid}`;
  }
  console.log("Fetching URL:", csvUrl);

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error('Failed to fetch');
  
  const csvData = await res.text();
  console.log("CSV Data length:", csvData.length);
  
  try {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    console.log("Records parsed:", records.length);
    console.log("First record:", records[0]);

    for (const record of records) {
        const clientName = record['CLIENTI'] || record['Clienti'];
        if (!clientName || clientName.trim() === '') continue;

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
    }
    console.log("Processing complete.");
  } catch(e) {
    console.error("Parse error:", e);
  }
}

main().catch(console.error);
