import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { 
        id: true, name: true, email: true, role: true, avatarUrl: true, loginCount: true, totalUsageTime: true, theme: true,
        _count: {
          select: {
            cards: { where: { isArchived: false, list: { NOT: [{ name: { contains: 'fatto' } }, { name: { contains: 'completat' } }] } } },
            checklistItems: { where: { isCompleted: false } },
            projects: { where: { isArchived: false, status: { not: 'Completato' } } }
          }
        },
        cards: {
          where: { isArchived: false, list: { NOT: [{ name: { contains: 'fatto' } }, { name: { contains: 'completat' } }] }, clientId: { not: null } },
          select: { clientId: true }
        },
        projects: {
          where: { isArchived: false, status: { not: 'Completato' }, clientId: { not: null } },
          select: { clientId: true }
        }
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Errore fetch users:", error);
    return NextResponse.json({ error: 'Errore nel recupero utenti' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, Email e Password sono obbligatori' }, { status: 400 });
    }

    // Hash della password prima del salvataggio
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, role: 'user' }, // Creiamo un utente base
      select: { id: true, name: true, email: true, role: true }
    });
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Errore creazione user:", error);
    return NextResponse.json({ error: 'Errore nella creazione utente. Forse questa email è già in uso?' }, { status: 500 });
  }
}
