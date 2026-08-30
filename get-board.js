const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const board = await prisma.board.findUnique({
        where: { id: 'cmqyyokb2002a12anvpu0x9ou' },
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

    console.log(JSON.stringify(board, null, 2));
    process.exit(0);
}

main();
