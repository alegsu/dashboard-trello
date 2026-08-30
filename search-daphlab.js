const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Search for cards with DAPHLAB
    const cards = await prisma.card.findMany({
        where: {
            OR: [
                { name: { contains: 'DAPH', mode: 'insensitive' } },
                { description: { contains: 'DAPH', mode: 'insensitive' } }
            ]
        },
        include: {
            assignees: true,
            checklists: {
                include: {
                    items: {
                        include: { assignees: true }
                    }
                }
            },
            list: true,
            board: true,
            project: true,
            client: true
        }
    });

    const projects = await prisma.project.findMany({
        where: {
            OR: [
                { name: { contains: 'DAPH', mode: 'insensitive' } },
                { description: { contains: 'DAPH', mode: 'insensitive' } }
            ]
        },
        include: {
            assignees: true,
            cards: true
        }
    });

    const clients = await prisma.client.findMany({
        where: {
            name: { contains: 'DAPH', mode: 'insensitive' }
        },
        include: {
            projects: true,
            cards: true
        }
    });

    console.log("CARDS:", JSON.stringify(cards, null, 2));
    console.log("PROJECTS:", JSON.stringify(projects, null, 2));
    console.log("CLIENTS:", JSON.stringify(clients, null, 2));
}

main().finally(async () => { await prisma.$disconnect() });
