import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const attachments = await prisma.attachment.findMany({
      where: { cardId: id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(attachments);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching attachments' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { name, url } = await request.json();

    if (!name || !url) {
      return NextResponse.json({ error: 'Missing name or url' }, { status: 400 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        name,
        url,
        cardId: id
      }
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error creating attachment:', error);
    return NextResponse.json({ error: 'Error creating attachment' }, { status: 500 });
  }
}
