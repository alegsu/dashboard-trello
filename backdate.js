const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backdateCards() {
  try {
    const cards = await prisma.card.findMany({
      where: {
        due: { not: null }
      }
    });

    let updated = 0;
    const now = Date.now();

    for (const card of cards) {
      // If createdAt is essentially today (e.g. within the last hour), it means it was added by the schema migration
      const createdTime = new Date(card.createdAt).getTime();
      const updatedTime = new Date(card.updatedAt).getTime();
      const dueTime = new Date(card.due).getTime();
      
      // If createdAt is very recent (within 2 hours), let's backdate it
      if (now - createdTime < 2 * 60 * 60 * 1000) {
        // We will backdate it to either updatedAt (if older than today) or 14 days before due, whichever makes sense
        let newCreatedAt = updatedTime;
        
        // If updatedAt is also today (unlikely unless they just updated it), 
        // or if updatedAt is AFTER due date (can happen), let's just do due - 14 days
        if (newCreatedAt > dueTime || (now - newCreatedAt < 2 * 60 * 60 * 1000)) {
           newCreatedAt = dueTime - (14 * 24 * 60 * 60 * 1000); // 14 days before due
        }
        
        // If newCreatedAt is still in the future (impossible but just in case)
        if (newCreatedAt > now) newCreatedAt = now - (2 * 24 * 60 * 60 * 1000);

        await prisma.card.update({
          where: { id: card.id },
          data: {
            createdAt: new Date(newCreatedAt)
          }
        });
        updated++;
      }
    }
    console.log(`Backdated ${updated} cards.`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
backdateCards();
