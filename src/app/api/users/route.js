import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { 
        id: true, name: true, email: true, role: true, avatarUrl: true, loginCount: true, totalUsageTime: true, usageTimeToday: true, totalActiveTime: true, activeTimeToday: true, theme: true, lastActiveAt: true,
        _count: {
          select: {
            cards: { where: { isArchived: false, list: { NOT: [{ name: { contains: 'fatto', mode: 'insensitive' } }, { name: { contains: 'completat', mode: 'insensitive' } }] } } },
            checklistItems: { where: { isCompleted: false } },
            projects: { where: { isArchived: false, status: { not: 'Completato' } } }
          }
        },
        cards: {
          where: { isArchived: false, list: { NOT: [{ name: { contains: 'fatto', mode: 'insensitive' } }, { name: { contains: 'completat', mode: 'insensitive' } }] } },
          select: { 
            clientId: true,
            _count: { select: { checklists: true } }
          }
        },
        projects: {
          where: { isArchived: false, status: { not: 'Completato' }, clientId: { not: null } },
          select: { clientId: true }
        }
      }
    });

    // Fetch completati (visto che _count non supporta gli alias)
    const enrichedUsers = await Promise.all(users.map(async (u) => {
      const cardsDone = await prisma.card.count({
        where: { assignees: { some: { id: u.id } }, list: { OR: [{ name: { contains: 'fatto', mode: 'insensitive' } }, { name: { contains: 'completat', mode: 'insensitive' } }] } }
      });
      const checklistItemsDone = await prisma.checklistItem.count({
        where: { checklist: { card: { assignees: { some: { id: u.id } } } }, isCompleted: true }
      });
      const projectsDone = await prisma.project.count({
        where: { assignees: { some: { id: u.id } }, status: 'Completato' }
      });
      const cardsOverdue = await prisma.card.count({
        where: { 
          assignees: { some: { id: u.id } }, 
          isArchived: false, 
          due: { lt: new Date() },
          list: { NOT: [{ name: { contains: 'fatto', mode: 'insensitive' } }, { name: { contains: 'completat', mode: 'insensitive' } }] }
        }
      });

      // Calcolo tempo medio in ore per chiudere le schede
      const completedCardsData = await prisma.card.findMany({
        where: { assignees: { some: { id: u.id } }, completedAt: { not: null } },
        select: { createdAt: true, completedAt: true }
      });
      let avgCardHours = 0;
      if (completedCardsData.length > 0) {
        const totalMs = completedCardsData.reduce((acc, c) => acc + (new Date(c.completedAt) - new Date(c.createdAt)), 0);
        avgCardHours = Math.round((totalMs / completedCardsData.length) / (1000 * 60 * 60));
      }

      // Calcola se i valori 'oggi' sono validi
      let usageTimeToday = u.usageTimeToday;
      let activeTimeToday = u.activeTimeToday;
      if (u.lastActiveAt) {
        const formatter = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
        if (formatter.format(new Date(u.lastActiveAt)) !== formatter.format(new Date())) {
          usageTimeToday = 0;
          activeTimeToday = 0;
        }
      }

      return {
        ...u,
        usageTimeToday,
        activeTimeToday,
        avgCardHours,
        _count: {
          ...u._count,
          cardsDone,
          checklistItemsDone,
          projectsDone,
          cardsOverdue
        }
      };
    }));

    return NextResponse.json(enrichedUsers);
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
