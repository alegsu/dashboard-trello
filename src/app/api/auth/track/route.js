import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    const { userId, isActive } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const now = new Date();
      let usageTimeToday = user.usageTimeToday;
      let activeTimeToday = user.activeTimeToday;
      
      // Reset daily usage if last active was before today
      let isNewDay = false;
      if (user.lastActiveAt) {
        const formatter = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
        const lastDateString = formatter.format(new Date(user.lastActiveAt));
        const nowDateString = formatter.format(now);
        
        if (lastDateString !== nowDateString) {
          usageTimeToday = 0;
          activeTimeToday = 0;
          isNewDay = true;
        }
      }

      const updateData = { 
        totalUsageTime: { increment: 1 },
        usageTimeToday: usageTimeToday + 1,
        lastActiveAt: now
      };

      if (isActive) {
        updateData.totalActiveTime = { increment: 1 };
        updateData.activeTimeToday = activeTimeToday + 1;
      } else if (isNewDay) {
        // Se è un nuovo giorno ma NON è attivo, dobbiamo assicurarci di salvare il reset a 0!
        updateData.activeTimeToday = 0;
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
