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
        assignees: true,
        comments: { include: { author: true } }
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
              if (dayPlan[type] > 0) {
                const existingCount = await prisma.socialPost.count({
                  where: {
                    date: currentDate,
                    type: type,
                    clientId: client.id
                  }
                });

                const toGenerate = dayPlan[type] - existingCount;

                for (let i = 0; i < toGenerate; i++) {
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
    }

    return NextResponse.json({ success: true, generatedCount });
  } catch (error) {
    console.error('Error generating social posts:', error);
    return NextResponse.json({ error: 'Failed to generate social posts' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const clientId = searchParams.get('clientId');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 });
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    const whereClause = {
      date: {
        gte: start,
        lte: end
      }
    };

    if (clientId) {
      whereClause.clientId = clientId;
    }

    const result = await prisma.socialPost.deleteMany({
      where: whereClause
    });

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error('Error deleting social posts:', error);
    return NextResponse.json({ error: 'Failed to delete social posts' }, { status: 500 });
  }
}
