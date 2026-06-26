import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { role } = await request.json();
    
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    return NextResponse.json(updatedUser);
  } catch (err) {
    return NextResponse.json({ error: 'Errore durante aggiornamento utente' }, { status: 500 });
  }
}
