const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cards = await prisma.card.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { client: true, assignees: true, labels: true }
  });
  console.log("LAST 5 CARDS:");
  cards.forEach(c => {
    console.log(`- [${c.createdAt.toISOString()}] Name: "${c.name}" | Client: "${c.client?.name}" | Assignees: ${c.assignees.map(a => a.name).join(', ')} | Due: ${c.due}`);
  });

  const notes = await prisma.knowledgeNote.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { client: true }
  });
  console.log("\nLAST 5 NOTES:");
  notes.forEach(n => {
    console.log(`- [${n.createdAt.toISOString()}] Text: "${n.text.slice(0, 50)}..." | Client: "${n.client?.name}"`);
  });
}

main().finally(() => prisma.$disconnect());
