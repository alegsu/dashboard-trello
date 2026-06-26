import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(clients);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore nel recupero dei clienti' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    
    const client = await prisma.client.create({
      data: { name }
    });
    return NextResponse.json(client);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore nella creazione del cliente' }, { status: 500 });
  }
}
