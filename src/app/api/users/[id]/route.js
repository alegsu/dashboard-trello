import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.role && body.role !== 'admin' && body.role !== 'user') {
      return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(body.role && { role: body.role }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
        ...(body.loginCount !== undefined && { loginCount: body.loginCount }),
        ...(body.totalUsageTime !== undefined && { totalUsageTime: body.totalUsageTime }),
        ...(body.theme !== undefined && { theme: body.theme }),
        ...(body.notifyMentions !== undefined && { notifyMentions: body.notifyMentions }),
        ...(body.notifyAssignedCard !== undefined && { notifyAssignedCard: body.notifyAssignedCard }),
        ...(body.notifyAssignedList !== undefined && { notifyAssignedList: body.notifyAssignedList }),
        ...(body.notifyCardDue !== undefined && { notifyCardDue: body.notifyCardDue }),
        ...(body.notifyDailyRecap !== undefined && { notifyDailyRecap: body.notifyDailyRecap }),
        ...(body.aiChecklistEnabled !== undefined && { aiChecklistEnabled: body.aiChecklistEnabled }),
        ...(body.aiReportEnabled !== undefined && { aiReportEnabled: body.aiReportEnabled }),
        ...(body.aiCategorizeEnabled !== undefined && { aiCategorizeEnabled: body.aiCategorizeEnabled }),
      }
    });

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
