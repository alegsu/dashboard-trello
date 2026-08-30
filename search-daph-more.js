const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clients = await prisma.client.findMany({ select: { name: true }});
    console.log(clients.map(c => c.name));
    
    // Also, search if there is any SocialPost for Daph Lab
    const posts = await prisma.socialPost.findMany({
        where: { client: { name: { contains: 'daph', mode: 'insensitive' } } },
        include: { assignees: true }
    });
    console.log("SOCIAL POSTS:", JSON.stringify(posts, null, 2));
    
    const projects = await prisma.project.findMany({
        where: { OR: [
            { clientName: { contains: 'daph', mode: 'insensitive' } },
            { name: { contains: 'daph', mode: 'insensitive' } }
        ]},
        include: { assignees: true }
    });
    console.log("PROJECTS DAPH:", JSON.stringify(projects, null, 2));
}

main().finally(async () => { await prisma.$disconnect() });
