import { prisma } from './prisma.js';
import OpenAI from 'openai';
import { extractText } from 'unpdf';

// Normalizza un numero telefonico per il confronto sicuro (rimuove spazi, trattini, prefissi internazionali)
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let clean = phone.toString().replace(/[^0-9]/g, '');
  if (clean.startsWith('00')) clean = clean.substring(2);
  return clean;
}

// Verifica se due numeri corrispondono (con o senza prefisso 39)
export function isPhoneMatch(phoneA, phoneB) {
  const normA = normalizePhoneNumber(phoneA);
  const normB = normalizePhoneNumber(phoneB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.endsWith(normB) || normB.endsWith(normA)) {
    const diff = Math.abs(normA.length - normB.length);
    if (diff === 2 || diff === 3) return true;
  }
  return false;
}

// Estrae il testo da un buffer PDF usando unpdf
export async function extractTextFromPdfBuffer(buffer) {
  try {
    const uint8Array = new Uint8Array(buffer);
    const result = await extractText(uint8Array);
    if (typeof result === 'string') return result;
    if (result && Array.isArray(result.text)) {
      return result.text.join('\n');
    }
    if (result && typeof result.text === 'string') {
      return result.text;
    }
    return '';
  } catch (err) {
    console.error('[BoatsAI] Errore estrazione testo PDF:', err);
    return '';
  }
}

// Analizza il testo della scheda barca con OpenAI per estrarre le specifiche
export async function extractBoatMetadataWithAI(pdfText, fileName = '') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[BoatsAI] OPENAI_API_KEY non presente, uso metadati predefiniti');
    return {
      title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      model: null,
      manufacturer: null,
      year: null,
      length: null,
      cabins: null,
      baths: null,
      engines: null,
      price: 'Su richiesta',
      description: pdfText.slice(0, 500) || 'Scheda barca disponibile.',
      features: null
    };
  }

  const openai = new OpenAI({ apiKey });

  const prompt = `
Sei un perito ed esperto nautico. Analizza il seguente testo estratto da una brochure / scheda tecnica di una barca (nome file di riferimento: "${fileName}").
Estrai le specifiche strutturate in formato JSON con questi campi:
- "title": Titolo completo e accattivante della barca (es. "Beneteau Oceanis 51.1" o "Sanlorenzo SX88").
- "model": Modello esatto (es. "Oceanis 51.1").
- "manufacturer": Cantiere / Costruttore (es. "Beneteau", "Sanlorenzo", "Azimut", "Bavaria").
- "year": Anno di costruzione come numero intero (es. 2022) oppure null se non specificato.
- "length": Lunghezza fuori tutto (LOA) in metri come numero decimale (es. 15.94) oppure null.
- "cabins": Numero di cabine per ospiti come intero (es. 3) oppure null.
- "baths": Numero di bagni come intero (es. 2) oppure null.
- "engines": Motorizzazione completa (es. "2x Volvo Penta IPS 800 - 600hp" o "Yanmar 80 CV") oppure null.
- "price": Prezzo formattato (es. "€ 390.000" o "Trattativa riservata" o "Su richiesta").
- "description": Riassunto commerciale elegante ed esaustivo della barca (1-2 paragrafi accattivanti).
- "features": Elenco dei punti di forza e dotazioni principali separati da virgola (es. "Aria condizionata, Generatore, Dissalatore, Teak, Elica di prua").

TESTO DELLA SCHEDA:
${pdfText.slice(0, 15000)}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Rispondi esclusivamente con un oggetto JSON valido contenente i campi richiesti.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      title: parsed.title || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      model: parsed.model || null,
      manufacturer: parsed.manufacturer || null,
      year: parsed.year ? parseInt(parsed.year, 10) : null,
      length: parsed.length ? parseFloat(parsed.length) : null,
      cabins: parsed.cabins ? parseInt(parsed.cabins, 10) : null,
      baths: parsed.baths ? parseInt(parsed.baths, 10) : null,
      engines: parsed.engines || null,
      price: parsed.price || 'Su richiesta',
      description: parsed.description || 'Scheda tecnica dettagliata disponibile.',
      features: parsed.features || null
    };
  } catch (err) {
    console.error('[BoatsAI] Errore analisi AI metadati barca:', err);
    return {
      title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      model: null,
      manufacturer: null,
      year: null,
      length: null,
      cabins: null,
      baths: null,
      engines: null,
      price: 'Su richiesta',
      description: pdfText.slice(0, 500) || 'Scheda barca disponibile.',
      features: null
    };
  }
}

// Invia un documento PDF via WhatsApp Cloud API con supporto sia per Upload Diretto Binario che per Link
export async function sendWhatsAppDocument(optionsOrPhoneId, maybeToken, maybeTo, maybeUrl, maybeFilename, maybeCaption) {
  let phoneNumberId, accessToken, to, documentUrl, filename, caption, fileBuffer;

  if (typeof optionsOrPhoneId === 'object' && optionsOrPhoneId !== null) {
    phoneNumberId = optionsOrPhoneId.phoneNumberId;
    accessToken = optionsOrPhoneId.accessToken;
    to = optionsOrPhoneId.to;
    documentUrl = optionsOrPhoneId.documentUrl;
    filename = optionsOrPhoneId.filename || 'Scheda_Barca.pdf';
    caption = optionsOrPhoneId.caption || '';
    fileBuffer = optionsOrPhoneId.fileBuffer || null;
  } else {
    phoneNumberId = optionsOrPhoneId;
    accessToken = maybeToken;
    to = maybeTo;
    documentUrl = maybeUrl;
    filename = maybeFilename || 'Scheda_Barca.pdf';
    caption = maybeCaption || '';
    fileBuffer = null;
  }

  if (!phoneNumberId || !accessToken || !to) {
    console.warn('[BoatsAI] Parametri mancanti per invio documento WhatsApp');
    return { success: false, error: 'Parametri mancanti' };
  }

  const cleanPhone = to.toString().replace(/[^0-9]/g, '');

  // 1. STRATEGIA PRIMARIA: Caricamento diretto del file su Meta Media API
  // In questo modo Meta possiede il file sui propri server ed evita qualsiasi errore 401 o di rete!
  if (fileBuffer && Buffer.isBuffer(fileBuffer) && fileBuffer.length > 500) {
    try {
      console.log(`[BoatsAI] 📤 Upload diretto del PDF (${fileBuffer.length} bytes, "${filename}") su Meta Media API...`);
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', 'application/pdf');
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);

      const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        if (mediaData.id) {
          console.log(`[BoatsAI] ✅ Media ID ottenuto da Meta: ${mediaData.id}. Invio messaggio documento...`);
          const msgPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'document',
            document: {
              id: mediaData.id,
              filename: filename
            }
          };
          if (caption) msgPayload.document.caption = caption;

          const msgRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(msgPayload)
          });

          if (msgRes.ok) {
            console.log(`[BoatsAI] 🎉 Documento "${filename}" consegnato con successo su WhatsApp via Meta Media ID a ${cleanPhone}!`);
            return { success: true, method: 'media_id' };
          } else {
            console.warn('[BoatsAI] Invio via media_id fallito, tento fallback link:', await msgRes.text());
          }
        }
      } else {
        console.warn('[BoatsAI] Upload Meta Media API fallito, tento fallback link:', await mediaRes.text());
      }
    } catch (uploadErr) {
      console.warn('[BoatsAI] Eccezione durante upload Meta Media:', uploadErr.message);
    }
  }

  // 2. STRATEGIA SECONDARIA: Invio tramite link HTTP/HTTPS
  if (documentUrl) {
    try {
      console.log(`[BoatsAI] Invio documento via link URL a ${cleanPhone}: ${documentUrl}...`);
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'document',
        document: {
          link: documentUrl,
          filename: filename
        }
      };
      if (caption) payload.document.caption = caption;

      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log(`[BoatsAI] ✅ Documento "${filename}" inviato con successo via link URL a ${cleanPhone}`);
        return { success: true, method: 'link' };
      } else {
        const errText = await res.text();
        console.error('[BoatsAI] Errore invio documento via link Meta API:', errText);
        return { success: false, error: errText };
      }
    } catch (err) {
      console.error('[BoatsAI] Eccezione invio documento via link:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Nessun buffer o link disponibile per il documento' };
}

// Invia un messaggio di testo standard WhatsApp
export async function sendWhatsAppTextMessage(phoneNumberId, accessToken, to, text) {
  if (!phoneNumberId || !accessToken || !to || !text) return;
  const cleanPhone = to.toString().replace(/[^0-9]/g, '');
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: text }
      })
    });
    if (!res.ok) {
      console.error('[BoatsAI] Errore invio testo WhatsApp:', await res.text());
    }
  } catch (err) {
    console.error('[BoatsAI] Errore fetch testo WhatsApp:', err);
  }
}

// Elabora una richiesta WhatsApp per l'agente barche
export async function processBoatAssistantQuery({
  userMessage,
  senderName = 'Cliente',
  senderPhone,
  boatSheets = []
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY mancante');

  const openai = new OpenAI({ apiKey });

  // Prepara il catalogo formattato per il prompt
  const catalogContext = boatSheets.map(b => {
    return `
- ID: "${b.id}"
  Titolo: "${b.title}"
  Modello: "${b.model || 'N/D'}" | Cantiere: "${b.manufacturer || 'N/D'}" | Anno: ${b.year || 'N/D'}
  Lunghezza: ${b.length ? `${b.length} metri` : 'N/D'} | Cabine: ${b.cabins ?? 'N/D'} | Bagni: ${b.baths ?? 'N/D'}
  Motori: "${b.engines || 'N/D'}" | Prezzo: "${b.price || 'Su richiesta'}"
  Punti di forza: "${b.features || 'N/D'}"
  Descrizione: "${(b.description || '').slice(0, 400)}"
  Nome File Allegato: "${b.fileName}"
    `.trim();
  }).join('\n\n');

  const systemPrompt = `
Sei l'Assistente Nautico Intelligente via WhatsApp di un prestigioso broker e concessionario nautico.
Il tuo compito principale è assistere il cliente (${senderName}), rispondere a domande su barche, yacht e schede tecniche, E SOPRATTUTTO INVIARE IN ALLEGATO IL FILE PDF DELLA BROCHURE / SCHEDA quando richiesta!

CATALOGO BARCHE ATTUALMENTE DISPONIBILI:
${catalogContext || 'Nessuna barca attualmente a catalogo.'}

REGOLE CRUCIALI SULL'INVIO DELLE BROCHURE / SCHEDE (MASSIMA PRIORITÀ):
1. Se il messaggio del cliente contiene una richiesta o menzione di:
   - "brochure", "scheda", "scheda tecnica", "allegato", "pdf", "file", "documento", "depliant", "materiale", "fascicolo"
   - oppure frasi come: "mandami la brochure", "mi mandi la brochure", "vorrei la brochure", "inviami la brochure", "hai la brochure di...", "posso avere la brochure?", "mandami il pdf", "vorrei la scheda", "voglio vedere i dettagli"
   DEVI ASSOLUTAMENTE IMPOSTARE:
   - "sendAttachment": true
   - "boatIdToSend": <l'ID esatto della barca a catalogo corrispondente>
2. NON limitarti MAI a descrivere la barca solo via testo se il cliente ha chiesto una brochure o scheda! Se ha chiesto una brochure, "sendAttachment" DEVE ESSERE SEMPRE true!
3. Come individuare la barca da inviare ("boatIdToSend"):
   - Se il cliente nomina il modello o cantiere (es. "57steel", "sanlorenzo", "sl86"), assegna l'ID di quella barca.
   - Se il cliente chiede genericamente "mandami la brochure" senza specificare il nome della barca e ci sono barche a catalogo, seleziona la barca più rilevante (o la prima barca disponibile).
4. Nel testo del messaggio di accompagnamento ("replyMessage"):
   - Conferma con entusiasmo e professionalità che stai inviando la brochure/scheda tecnica in allegato: es. "Certamente! Ti ho allegato qui sotto la brochure ufficiale in PDF di [Nome Barca] 🚤📎".
   - Aggiungi un breve riepilogo elegante dei dati principali (lunghezza, cabine, motori, prezzo).
5. Solo se il cliente fa un semplice saluto o fa solo domande generali senza richiedere brochure o documenti (es. "Quali barche avete?", "Che barche ci sono con 3 cabine?"), imposta "sendAttachment": false e "boatIdToSend": null.

RISPONDI RIGOROSAMENTE in formato JSON valido:
{
  "replyMessage": "Messaggio di testo formattato per WhatsApp da inviare al cliente",
  "sendAttachment": true o false,
  "boatIdToSend": "id_univoco_della_barca_oppure_null"
}
`;

  const aiRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Mittente: ${senderName} (${senderPhone})\nMessaggio: ${userMessage}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });

  try {
    const parsed = JSON.parse(aiRes.choices[0].message.content);
    return parsed;
  } catch (err) {
    console.error('[BoatsAI] Errore parsing risposta AI barche:', err);
    return {
      replyMessage: "Ciao! Ho ricevuto la tua richiesta sulla brochure. Un nostro consulente verificherà la disponibilità.",
      sendAttachment: false,
      boatIdToSend: null
    };
  }
}
