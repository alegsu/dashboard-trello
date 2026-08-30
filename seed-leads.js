const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = [
    {
      companyName: "The Laurin",
      notes: "Da fissare una videochiamata a settembre. Sono interessati a servizi di creazione contenuti e gestione social.",
      status: "LEAD"
    },
    {
      companyName: "Carnera Srl",
      notes: "Inviare la brochure e fissare una videochiamata. Richiedono contenuti e gestione social per due ristoranti: Casa Carnera ed Esca – Bistrot di Mare.",
      status: "LEAD"
    },
    {
      companyName: "Rifugio Plose",
      notes: "Videochiamata già fissata per il 10 settembre. Richiedono contenuti e gestione social.",
      status: "CONTATTATO"
    },
    {
      companyName: "Ristorante Saraceno",
      notes: "Preparare il preventivo. Richiedono contenuti e gestione social.",
      status: "PREVENTIVO"
    },
    {
      companyName: "Agriturismo Santa Vittoria",
      notes: "Interessati a un incontro di persona a Volterra. Richiedono contenuti e gestione social.\n\nDa incastrare, se possibile, con trasferte in Toscana (Firenze/Lucca/Garfagnana).",
      status: "LEAD"
    },
    {
      companyName: "International Resort",
      notes: "Preparare il preventivo. Richiedono principalmente creazione di contenuti.",
      status: "PREVENTIVO"
    },
    {
      companyName: "Hotel Il Guelfo Bianco – Firenze",
      notes: "Interessati a un incontro di persona a Firenze (metà settembre). Durante il confronto è emersa la possibilità di collaborare per un altro loro hotel a Madrid. Richiedono contenuti e gestione social.\n\nDa incastrare con trasferte progetto Hotel L'Orologio.",
      status: "LEAD"
    },
    {
      companyName: "La Polledrara Relais",
      notes: "In coda per essere ricontattati dopo un primo contatto.",
      status: "CONTATTATO"
    },
    {
      companyName: "Hotel Relais Ducale",
      notes: "In coda per essere ricontattati (provare a smarcarlo in data 30/08).",
      status: "CONTATTATO"
    },
    {
      companyName: "Fattoria Zoff",
      notes: "In coda per essere ricontattati (provare a smarcarlo in data 30/08).",
      status: "CONTATTATO"
    },
    {
      companyName: "Wellness Holidays Srl",
      notes: "In coda per essere ricontattati dopo un primo contatto.",
      status: "CONTATTATO"
    },
    {
      companyName: "Agri Relais Moscatello Muliner",
      contactName: "Maria Vischioni",
      email: "info@agrirelaismoscatellomuliner.it",
      phone: "+39030918521",
      notes: "Città: Pozzolengo.\nRichiesta da email: Interessati a valutare l'affidamento della gestione dei canali social. Chiedono info su attività ordinarie (piano editoriale, creazione contenuti, community), canali adatti, organizzazione produzione mensile, fascia di prezzo. Vogliono capire l'investimento per poi fissare una videochiamata.",
      status: "LEAD"
    }
  ];

  console.log("Inserimento leads in corso...");
  for (const lead of leads) {
    await prisma.lead.create({
      data: lead
    });
    console.log(`Inserito: ${lead.companyName}`);
  }
  console.log("Completato!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
