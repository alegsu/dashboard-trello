import { prisma } from './prisma';
import { sendNotificationEmail } from './mailer';

export async function processMentions(text, authorId, link, contextText) {
  if (!text) return;
  
  // Trova tutti i token che iniziano con @ (accetta anche il punto, dato che auto-completiamo username compressi)
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  let match;
  const mentionedNames = new Set();
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentionedNames.add(match[1].toLowerCase());
  }

  if (mentionedNames.size === 0) return;

  const author = await prisma.user.findUnique({ where: { id: authorId } });
  if (!author) return;

  // Cerca gli utenti menzionati nel DB
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    const rawName = user.name.toLowerCase().replace(/\s+/g, '');
    const firstName = user.name.toLowerCase().split(' ')[0].replace(/[^a-z0-9_.-]/g, '');
    const partials = Array.from(mentionedNames);
    
    // Controlla se la mention esatta coincide con il nome compressato (rawName), 
    // oppure con il solo nome di battesimo (firstName). Non usiamo startsWith per evitare falsi positivi
    // tra utenti con nomi simili (es. @ale menzionava sia Alessandro che Alessio).
    const isMentioned = partials.some(p => rawName === p || firstName === p);
    
    if (isMentioned) {
      // if (user.id === authorId) continue; // L'utente vuole ricevere notifiche anche se si auto-menziona
      
      const message = `${author.name} ti ha menzionato: "${contextText}"`;
      
      // Crea notifica nel DB
      await prisma.notification.create({
        data: {
          userId: user.id,
          message,
          link
        }
      });

      // Invece di inviare subito l'email, la accodiamo per evitare spam (Debouncing)
      await prisma.pendingNotification.create({
        data: {
          userId: user.id,
          type: "MENTION",
          message: `${author.name} ti ha menzionato in: ${contextText}`,
          link: link
        }
      });
    }
  }
}
