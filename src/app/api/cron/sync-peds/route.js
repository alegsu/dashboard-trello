import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Determine the base URL dynamically based on the request url to fetch our own endpoint
    const url = new URL(request.url);
    const pedSyncUrl = `${url.protocol}//${url.host}/api/sync/ped`;

    const res = await fetch(pedSyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Empty body means sync ALL
    });

    if (!res.ok) {
        throw new Error('Failed to fetch /api/sync/ped');
    }

    const data = await res.json();

    return NextResponse.json({ 
        success: true, 
        message: `Sincronizzazione PED completata. ${data.syncedCount} post aggiornati.`,
        details: data
    });

  } catch (error) {
    console.error("Cron Sync PEDs Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
