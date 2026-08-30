import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
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
    const body = await request.json();
    const { companyName, contactName, email, phone, value, source, brand, assignedToId, notes, nextActionDate } = body;

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
        assignedToId,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null
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
