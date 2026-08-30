const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
    const users = await prisma.user.findMany({ 
        include: { 
            _count: { 
                select: { completedCards: true, completedTasks: true } 
            } 
        } 
    }); 
    
    console.log(JSON.stringify(users.map(u => ({ 
        name: u.name, 
        cards: u._count.completedCards, 
        tasks: u._count.completedTasks, 
        activeTime: u.totalActiveTime, 
        usageTime: u.totalUsageTime,
        loginCount: u.loginCount
    })), null, 2)); 
} 

main().finally(async () => { await prisma.$disconnect() });
