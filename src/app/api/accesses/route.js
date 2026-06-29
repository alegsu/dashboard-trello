import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  try {
    const accesses = await prisma.access.findMany({
      include: {
        clients: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(accesses);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch accesses' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, url, username, password, notes, type, showInCard, clientIds } = data;

    const access = await prisma.access.create({
      data: {
        name,
        url,
        username,
        password,
        notes,
        type: type || 'SUPPLIER',
        showInCard: showInCard !== undefined ? showInCard : true,
        ...(clientIds && clientIds.length > 0 && {
          clients: {
            connect: clientIds.map(id => ({ id }))
          }
        })
      },
      include: {
        clients: true
      }
    });

    return NextResponse.json(access);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create access' }, { status: 500 });
  }
}
