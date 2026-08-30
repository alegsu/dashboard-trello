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
                        }
                    }
                }
            }
        }
    });

    const activeCards = [];
    board.lists.forEach(list => {
        if (list.name !== 'FATTO') {
            list.cards.forEach(card => {
                const isAleCard = card.assignees.some(a => a.name === 'Ale');
                if (isAleCard) {
                    activeCards.push({
                        card: card.name,
                        list: list.name,
                        description: card.description
                    });
                }
            });
        }
    });

    console.log(JSON.stringify(activeCards, null, 2));
    process.exit(0);
}

main();
