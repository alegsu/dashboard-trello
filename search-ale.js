const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            name: { contains: 'ale', mode: 'insensitive' }
        },
        include: {
            cards: {
                include: {
                    client: true,
                    project: true,
                    checklists: {
                        include: {
                            items: {
                                include: { assignees: true }
                            }
                        }
                    }
                }
            },
            checklistItems: {
                include: {
                    checklist: {
                        include: {
                            card: {
                                include: { client: true, project: true }
                            }
                        }
                    }
                }
            }
        }
    });
    
    console.log(JSON.stringify(users.map(u => ({
        id: u.id,
        name: u.name,
        assignedCards: u.cards.map(c => ({
            id: c.id,
            name: c.name,
            client: c.client?.name,
            project: c.project?.name,
            checklists: c.checklists.map(cl => ({
                title: cl.title,
                items: cl.items.map(i => ({ text: i.text, completed: i.isCompleted, assignees: i.assignees.map(a => a.name) }))
            }))
        })),
        assignedChecklistItems: u.checklistItems.map(ci => ({
            id: ci.id,
            text: ci.text,
            isCompleted: ci.isCompleted,
            cardName: ci.checklist?.card?.name,
            clientName: ci.checklist?.card?.client?.name
        }))
    })), null, 2));
}

main().finally(async () => { await prisma.$disconnect() });
