import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/utils/auth';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
        return NextResponse.json({ error: 'Email e Password sono obbligatori' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Credenziali non valide o utente inesistente' }, { status: 401 });
    }

    // Verifica password criptata
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Password errata' }, { status: 401 });
    }

    // Creazione del token JWT
    const sessionData = { id: user.id, email: user.email, name: user.name, role: user.role };
    const sessionToken = await encrypt(sessionData);

    // Impostazione del Cookie sicuro
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 giorni di login persistente
    });

    return NextResponse.json({ success: true, user: sessionData });
  } catch (error) {
    console.error("Errore di Login:", error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
