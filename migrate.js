const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const db = new Database('./prisma/dev.db', { readonly: true });

async function migrate() {
  console.log('Starting migration from SQLite to Postgres...');

  // Helper to fetch all rows
  const getAll = (table) => db.prepare(`SELECT * FROM ${table}`).all();

  try {
    // Users
    const users = getAll('User');
    for (const u of users) {
      await prisma.user.create({ data: u });
    }
    console.log(`Migrated ${users.length} users.`);

    // Clients
    const clients = getAll('Client');
    for (const c of clients) {
      await prisma.client.create({ data: {
        id: c.id,
        name: c.name,
        createdAt: new Date(c.createdAt),
        driveFolderId: c.driveFolderId
      }});
    }
    console.log(`Migrated ${clients.length} clients.`);

    // Projects
    const projects = getAll('Project');
    for (const p of projects) {
      await prisma.project.create({ data: {
        id: p.id,
        name: p.name,
        description: p.description,
        clientName: p.clientName,
        clientId: p.clientId,
        createdAt: new Date(p.createdAt),
        status: p.status,
        category: p.category,
        priority: p.priority,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
        estimatedHours: p.estimatedHours,
        actualHours: p.actualHours,
        sellingPrice: p.sellingPrice,
        budget: p.budget,
        effort: p.effort,
        driveFolderId: p.driveFolderId,
        notes: p.notes,
        isArchived: p.isArchived === 1
      }});
    }
    console.log(`Migrated ${projects.length} projects.`);

    // Boards
    const boards = getAll('Board');
    for (const b of boards) {
      await prisma.board.create({ data: {
        id: b.id,
        name: b.name,
        isArchived: b.isArchived === 1
      } });
    }
    console.log(`Migrated ${boards.length} boards.`);

    // Lists
    const lists = getAll('List');
    for (const l of lists) {
      await prisma.list.create({ data: {
        id: l.id,
        name: l.name,
        order: l.order,
        startDate: l.startDate ? new Date(l.startDate) : null,
        endDate: l.endDate ? new Date(l.endDate) : null,
        boardId: l.boardId,
        isArchived: l.isArchived === 1
      } });
    }
    console.log(`Migrated ${lists.length} lists.`);

    // Cards
    const cards = getAll('Card');
    for (const c of cards) {
      await prisma.card.create({ data: {
        id: c.id,
        name: c.name,
        description: c.description,
        due: c.due ? new Date(c.due) : null,
        order: c.order,
        listId: c.listId,
        boardId: c.boardId,
        color: c.color,
        projectId: c.projectId,
        clientId: c.clientId,
        isArchived: c.isArchived === 1
      } });
    }
    console.log(`Migrated ${cards.length} cards.`);

    // Labels
    const labels = getAll('Label');
    for (const l of labels) {
      await prisma.label.create({ data: l });
    }
    console.log(`Migrated ${labels.length} labels.`);

    // Checklists
    const checklists = getAll('Checklist');
    for (const c of checklists) {
      await prisma.checklist.create({ data: c });
    }
    console.log(`Migrated ${checklists.length} checklists.`);

    // ChecklistItems
    const checklistItems = getAll('ChecklistItem');
    for (const item of checklistItems) {
      await prisma.checklistItem.create({ data: {
        id: item.id,
        text: item.text,
        isCompleted: item.isCompleted === 1,
        order: item.order,
        checklistId: item.checklistId
      }});
    }
    console.log(`Migrated ${checklistItems.length} checklist items.`);

    // Comments
    const comments = getAll('Comment');
    for (const c of comments) {
      await prisma.comment.create({ data: {
        id: c.id,
        text: c.text,
        createdAt: new Date(c.createdAt),
        cardId: c.cardId,
        authorId: c.authorId
      } });
    }
    console.log(`Migrated ${comments.length} comments.`);

    // ProjectComments
    const pComments = getAll('ProjectComment');
    for (const c of pComments) {
      await prisma.projectComment.create({ data: {
        id: c.id,
        text: c.text,
        createdAt: new Date(c.createdAt),
        projectId: c.projectId,
        authorId: c.authorId
      } });
    }
    console.log(`Migrated ${pComments.length} project comments.`);

    // Notifications
    const notifications = getAll('Notification');
    for (const n of notifications) {
      await prisma.notification.create({ data: {
        id: n.id,
        userId: n.userId,
        message: n.message,
        read: n.read === 1,
        link: n.link,
        createdAt: new Date(n.createdAt)
      } });
    }
    console.log(`Migrated ${notifications.length} notifications.`);

    // Attachments
    const attachments = getAll('Attachment');
    for (const a of attachments) {
      await prisma.attachment.create({ data: {
        id: a.id,
        name: a.name,
        url: a.url,
        cardId: a.cardId,
        projectId: a.projectId,
        createdAt: new Date(a.createdAt)
      }});
    }
    console.log(`Migrated ${attachments.length} attachments.`);

    // SystemSettings
    const settings = getAll('SystemSetting');
    for (const s of settings) {
      await prisma.systemSetting.create({ data: s });
    }
    console.log(`Migrated ${settings.length} system settings.`);

    // Relations (CardAssignees, ListAssignees, etc.)
    // These are many-to-many. In SQLite they are in _TableName.
    const _CardAssignees = getAll('_CardAssignees');
    for (const row of _CardAssignees) {
      await prisma.card.update({
        where: { id: row.A },
        data: { assignees: { connect: { id: row.B } } }
      }).catch(() => {});
    }
    
    const _ListAssignees = getAll('_ListAssignees');
    for (const row of _ListAssignees) {
      await prisma.list.update({
        where: { id: row.A },
        data: { assignees: { connect: { id: row.B } } }
      }).catch(() => {});
    }

    const _CardLabels = getAll('_CardLabels');
    for (const row of _CardLabels) {
      await prisma.card.update({
        where: { id: row.A },
        data: { labels: { connect: { id: row.B } } }
      }).catch(() => {});
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

migrate();
