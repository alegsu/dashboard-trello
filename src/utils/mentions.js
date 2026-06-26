import { prisma } from './prisma';
import { sendNotificationEmail } from './mailer';

export async function processMentions(text, authorId, link, contextText) {
  if (!text) return;
  
  // Trova tutti i token che iniziano con @
  const mentionRegex = /@(\w+)/g;
  let match;
  const mentionedNames = new Set();
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentionedNames.add(match[1].toLowerCase());
  }

  if (mentionedNames.size === 0) return;

  const author = await prisma.user.findUnique({ where: { id: authorId } });
  if (!author) return;

  // Cerca gli utenti menzionati nel DB (case insensitive via codice o DB)
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    if (mentionedNames.has(user.name.toLowerCase().replace(/\s+/g, ''))) {
      if (user.id === authorId) continue; // Non auto-notificarsi
      
      const message = `${author.name} ti ha menzionato: "${contextText}"`;
      
      // Crea notifica nel DB
      await prisma.notification.create({
        data: {
          userId: user.id,
          message,
          link
        }
      });

      // Invia email
      await sendNotificationEmail(
        user.email,
        `Nuova menzione da ${author.name}`,
        `Ciao ${user.name},\n\nSei stato menzionato da ${author.name} in questa conversazione/attività:\n\n"${text}"\n\nPuoi visualizzarla qui: ${link}\n\nA presto!`
      );
    }
  }
}
