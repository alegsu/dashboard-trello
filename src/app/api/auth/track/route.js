import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const now = new Date();
      let usageTimeToday = user.usageTimeToday;
      
      // Reset daily usage if last active was before today
      if (user.lastActiveAt) {
        const lastActiveDate = new Date(user.lastActiveAt);
        if (lastActiveDate.toDateString() !== now.toDateString()) {
          usageTimeToday = 0;
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { 
          totalUsageTime: { increment: 1 },
          usageTimeToday: usageTimeToday + 1,
          lastActiveAt: now
        }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
