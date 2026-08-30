const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lists = await prisma.list.findMany({
        where: { name: { contains: 'daph', mode: 'insensitive' } },
        include: { assignees: true, cards: { include: { assignees: true, checklists: { include: { items: { include: { assignees: true } } } } } } }
    });
    console.log("LISTS:", JSON.stringify(lists, null, 2));
    
    // Let's also check if Ale has ANY active task across all projects that mentions Daph
    const aleTasks = await prisma.checklistItem.findMany({
        where: {
            text: { contains: 'daph', mode: 'insensitive' },
            assignees: { some: { name: { contains: 'ale', mode: 'insensitive' } } }
        }
    });
    console.log("ALE TASKS:", JSON.stringify(aleTasks, null, 2));

    const aleCards = await prisma.card.findMany({
        where: {
            OR: [
                { name: { contains: 'daph', mode: 'insensitive' } },
                { description: { contains: 'daph', mode: 'insensitive' } }
            ],
            assignees: { some: { name: { contains: 'ale', mode: 'insensitive' } } }
        }
    });
    console.log("ALE CARDS:", JSON.stringify(aleCards, null, 2));
}

main().finally(async () => { await prisma.$disconnect() });
