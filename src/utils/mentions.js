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
    const partials = Array.from(mentionedNames);
    
    // Controlla se la mention esatta coincide, o se il rawName *inizia* con la mention (così @ale becca alessandro)
    const isMentioned = partials.some(p => rawName === p || rawName.startsWith(p));
    
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

      // HTML Email format
      const htmlEmail = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f8f9fa; padding: 20px; border-bottom: 1px solid #ddd;">
            <h2 style="margin: 0; color: #007bff;">Nuova Menzione!</h2>
          </div>
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Ciao <strong>${user.name}</strong>,</p>
            <p style="font-size: 16px;"><strong>${author.name}</strong> ti ha appena menzionato in <strong>${contextText}</strong>:</p>
            <blockquote style="background: #f1f3f5; padding: 15px; border-left: 5px solid #007bff; font-style: italic; margin: 20px 0; border-radius: 4px;">
              "${text}"
            </blockquote>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Visualizza su GestionAle</a>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #777;">
            Ricevi questa email perché hai attive le notifiche sulle menzioni nel gestionale.
          </div>
        </div>
      `;

      // Testo semplice fallback
      const textEmail = `Ciao ${user.name},\n\nSei stato menzionato da ${author.name} in questa conversazione/attività:\n\n"${text}"\n\nPuoi visualizzarla qui: ${link}\n\nA presto!`;

      // Invia email
      await sendNotificationEmail(
        user.email,
        `Nuova menzione da ${author.name}`,
        textEmail,
        htmlEmail
      );
    }
  }
}
