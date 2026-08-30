const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const board = await prisma.board.findUnique({
        where: { id: 'cmqyyokb2002a12anvpu0x9ou' }, // DAPH Lab
        include: {
            lists: {
                include: {
                    cards: {
                        include: {
                            assignees: true,
                            checklists: {
                                include: {
                                    items: {
                                        include: { assignees: true }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Find all cards assigned to Ale
    const aleCards = [];
    board.lists.forEach(list => {
        list.cards.forEach(card => {
            const isAleCard = card.assignees.some(a => a.name === 'Ale');
            let aleTasks = [];
            
            card.checklists.forEach(cl => {
                cl.items.forEach(item => {
                    if (item.assignees.some(a => a.name === 'Ale') || isAleCard) {
                        aleTasks.push({
                            checklist: cl.title,
                            task: item.text,
                            completed: item.isCompleted,
                            explicitlyAssignedToAle: item.assignees.some(a => a.name === 'Ale')
                        });
                    }
                });
            });

            if (isAleCard || aleTasks.some(t => t.explicitlyAssignedToAle)) {
                aleCards.push({
                    card: card.name,
                    list: list.name,
                    isCardAssignedToAle: isAleCard,
                    completedAt: card.completedAt,
                    tasks: aleTasks
                });
            }
        });
    });

    console.log(JSON.stringify(aleCards, null, 2));
    process.exit(0);
}

main();
