import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET() {
  try {
    await prisma.user.updateMany({
      data: { role: 'admin' }
    });
    return NextResponse.json({ success: true, message: 'All users made admin' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
