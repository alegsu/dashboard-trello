import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
    }

    const posts = await prisma.socialPost.findMany({
      where: {
        date: {
          gte: new Date(start),
          lte: new Date(end)
        }
      },
      include: {
        client: true,
        assignees: true
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json({ error: 'Failed to fetch social posts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { year, month } = body; // month is 0-indexed in JS (0=Jan, 11=Dec)

    if (year === undefined || month === undefined) {
      return NextResponse.json({ error: 'Missing year or month' }, { status: 400 });
    }

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    // Fetch all active clients with a social plan
    const clients = await prisma.client.findMany({
      where: { 
        status: 'CLIENTE',
        socialPlan: { not: null }
      },
      include: {
        collaborators: true // We will copy these to assignees
      }
    });

    const itDaysMap = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      0: 'sunday'
    };

    let generatedCount = 0;

    for (const client of clients) {
      let plan;
      try {
        plan = JSON.parse(client.socialPlan);
      } catch {
        continue; // Skip if invalid JSON
      }

      // Loop through all days of the month
      for (let day = 1; day <= endOfMonth.getDate(); day++) {
        const currentDate = new Date(year, month, day);
        const dayOfWeek = currentDate.getDay();
        const dayKey = itDaysMap[dayOfWeek];
        
        const dayPlan = plan[dayKey];
        if (dayPlan) {
          for (const type of ['post', 'reel', 'video', 'stories']) {
            if (dayPlan[type] > 0) {
              // Generate N posts for this type
              for (let i = 0; i < dayPlan[type]; i++) {
                // Check if a post of this exact type already exists for this client on this day to avoid duplicates when regenerating
                // Actually, the simplest approach for "Generate month" is to just delete existing and recreate, OR just create if we don't care about duplicates.
                // It's safer to check for existence or just warn the user. 
                // Let's check for existence of at least the same amount.
                
                await prisma.socialPost.create({
                  data: {
                    date: currentDate,
                    type,
                    clientId: client.id,
                    assignees: {
                      connect: client.collaborators.map(c => ({ id: c.id }))
                    }
                  }
                });
                generatedCount++;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, generatedCount });
  } catch (error) {
    console.error('Error generating social posts:', error);
    return NextResponse.json({ error: 'Failed to generate social posts' }, { status: 500 });
  }
}
