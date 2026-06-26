import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    for (const [key, value] of Object.entries(data)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error updating settings' }, { status: 500 });
  }
}
