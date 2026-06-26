import { NextResponse } from 'next/server';
import { decrypt } from '@/utils/auth';

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Rotte pubbliche che non richiedono login
  if (path === '/login' || path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Verifica il cookie di sessione
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await decrypt(sessionCookie) : null;

  // Proteggi le rotte API
  if (path.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Proteggi tutte le altre rotte (la Dashboard)
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Passiamo i dati della sessione tramite un header (opzionale, utile per layout)
  const response = NextResponse.next();
  response.headers.set('x-user-email', session.email);
  return response;
}

export const config = {
  // Applica il middleware a tutte le pagine tranne i file statici e immagini
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
