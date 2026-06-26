import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ isSetupRequired: userCount === 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Errore db' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Controllo di sicurezza vitale: permettiamo il setup SOLO se il DB è totalmente vuoto.
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json({ error: 'Accesso negato. Il setup Admin è già stato completato.' }, { status: 403 });
    }

    const { name, email, password } = await request.json();
    
    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Tutti i dati sono obbligatori per il setup' }, { status: 400 });
    }

    // Criptazione della password prima del salvataggio (sicurezza aziendale)
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'admin'
      }
    });

    return NextResponse.json({ success: true, message: 'Admin creato con successo!' }, { status: 201 });
  } catch (error) {
    console.error("Errore nel Setup:", error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
