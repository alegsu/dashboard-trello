import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const boat = await prisma.boatSheet.findUnique({ where: { id } });
    if (!boat) {
      return NextResponse.json({ error: 'Scheda barca non trovata' }, { status: 404 });
    }
    return NextResponse.json(boat);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.boatSheet.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.manufacturer !== undefined && { manufacturer: body.manufacturer }),
        ...(body.year !== undefined && { year: body.year ? parseInt(body.year, 10) : null }),
        ...(body.length !== undefined && { length: body.length ? parseFloat(body.length) : null }),
        ...(body.cabins !== undefined && { cabins: body.cabins !== null ? parseInt(body.cabins, 10) : null }),
        ...(body.baths !== undefined && { baths: body.baths !== null ? parseInt(body.baths, 10) : null }),
        ...(body.engines !== undefined && { engines: body.engines }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Boats API] Errore update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.boatSheet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Boats API] Errore delete:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
