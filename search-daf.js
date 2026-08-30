const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cards = await prisma.card.findMany({
        select: { id: true, name: true, description: true, client: { select: { name: true } } }
    });
    
    // Fuzzy search for daph, daf, dap
    const daphCards = cards.filter(c => 
        c.name.toLowerCase().includes('daph') || 
        c.name.toLowerCase().includes('daf') ||
        (c.client?.name || '').toLowerCase().includes('daph')
    );
    
    console.log("Found matches:", JSON.stringify(daphCards, null, 2));
}

main().finally(async () => { await prisma.$disconnect() });
