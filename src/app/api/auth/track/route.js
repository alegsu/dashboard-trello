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
      if (user.lastActiveAt) {
        const lastActiveDate = new Date(user.lastActiveAt);
        if (lastActiveDate.toDateString() !== now.toDateString()) {
          usageTimeToday = 0;
          activeTimeToday = 0;
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
