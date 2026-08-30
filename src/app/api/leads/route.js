import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { getServerSession } from 'next-auth';

export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      include: {
        assignedTo: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Errore durante il fetch dei lead' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json();
    const { companyName, contactName, email, phone, value, source, brand, assignedToId, notes } = body;

    if (!companyName) {
      return NextResponse.json({ error: 'Il nome azienda è obbligatorio' }, { status: 400 });
    }

    const newLead = await prisma.lead.create({
      data: {
        companyName,
        contactName,
        email,
        phone,
        value: value ? parseFloat(value) : null,
        source,
        brand: brand || 'ShinyUp',
        status: 'LEAD',
        notes,
        assignedToId
      },
      include: {
        assignedTo: true
      }
    });

    return NextResponse.json(newLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Errore durante la creazione del lead' }, { status: 500 });
  }
}
