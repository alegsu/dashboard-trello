import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'ShinyUp_Checklist_Operative.md');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const templates = [];
    let currentTemplate = null;
    let currentChecklist = null;

    for (let line of lines) {
      const h2Match = line.match(/^##\s+(.*)$/);
      if (h2Match) {
        if (h2Match[1].toLowerCase().includes('indice')) continue;
        currentTemplate = {
          title: h2Match[1].replace(/\\/g, '').trim(),
          checklists: []
        };
        templates.push(currentTemplate);
        currentChecklist = null;
        continue;
      }

      const h3Match = line.match(/^###\s+(.*)$/);
      if (h3Match && currentTemplate) {
        currentChecklist = {
          title: h3Match[1].replace(/\\/g, '').trim(),
          items: []
        };
        currentTemplate.checklists.push(currentChecklist);
        continue;
      }

      const itemMatch = line.match(/^(\s*)-\s*\[.*?\]\s*(.*)$/);
      if (itemMatch && currentChecklist) {
        const indent = itemMatch[1] || '';
        let text = itemMatch[2].trim();
        // Se c'è indentazione, potremmo mantenerla per capire gerarchie
        if (indent.length > 2) {
          text = '— ' + text;
        }
        currentChecklist.items.push(text);
      }
    }

    return NextResponse.json(templates);
  } catch (err) {
    console.error('Error parsing templates:', err);
    return NextResponse.json({ error: 'Error parsing templates' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { template, clientId, listId, boardId } = await request.json();
    if (!template || !listId || !boardId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Crea la Card
    const card = await prisma.card.create({
      data: {
        name: template.title,
        listId: listId,
        boardId: boardId,
        clientId: clientId !== 'none' ? clientId : null,
      }
    });

    // 2. Crea le Checklist e i ChecklistItems
    for (let i = 0; i < template.checklists.length; i++) {
      const cl = template.checklists[i];
      const newChecklist = await prisma.checklist.create({
        data: {
          title: cl.title,
          cardId: card.id,
          order: i
        }
      });

      for (let j = 0; j < cl.items.length; j++) {
        await prisma.checklistItem.create({
          data: {
            text: cl.items[j],
            checklistId: newChecklist.id,
            order: j
          }
        });
      }
    }

    return NextResponse.json({ success: true, cardId: card.id }, { status: 201 });
  } catch (err) {
    console.error('Error applying template:', err);
    return NextResponse.json({ error: 'Error applying template' }, { status: 500 });
  }
}
