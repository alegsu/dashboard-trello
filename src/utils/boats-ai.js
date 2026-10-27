import { prisma } from './prisma.js';
import OpenAI from 'openai';
import { extractText } from 'unpdf';

// Normalizza un numero telefonico per il confronto sicuro (rimuove spazi, trattini, prefissi internazionali)
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let clean = phone.toString().replace(/[^0-9]/g, '');
  // Rimuovi eventuale 00 iniziale
  if (clean.startsWith('00')) clean = clean.substring(2);
  // Se inizia con 39 (Italia) ed è lungo 12 cifre, tieni sia la versione con 39 che senza
  return clean;
}

// Verifica se due numeri corrispondono (con o senza prefisso 39)
export function isPhoneMatch(phoneA, phoneB) {
  const normA = normalizePhoneNumber(phoneA);
  const normB = normalizePhoneNumber(phoneB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.endsWith(normB) || normB.endsWith(normA)) {
    // Es. 393913514685 vs 3913514685
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
    throw new Error('OPENAI_API_KEY non configurata');
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

// Invia un documento PDF via WhatsApp Cloud API
export async function sendWhatsAppDocument(phoneNumberId, accessToken, to, documentUrl, filename, caption = '') {
  if (!phoneNumberId || !accessToken || !to || !documentUrl) {
    console.warn('[BoatsAI] Parametri mancanti per invio documento WhatsApp:', {
      hasPhoneId: !!phoneNumberId,
      hasToken: !!accessToken,
      hasTo: !!to,
      hasDocUrl: !!documentUrl
    });
    return { success: false, error: 'Parametri mancanti' };
  }

  const cleanPhone = to.toString().replace(/[^0-9]/g, '');
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'document',
    document: {
      link: documentUrl,
      filename: filename || 'Scheda_Barca.pdf'
    }
  };

  if (caption) {
    payload.document.caption = caption;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[BoatsAI] Errore invio documento WhatsApp Meta API:', errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    console.log(`[BoatsAI] ✅ Documento "${filename}" inviato con successo a ${cleanPhone}`);
    return { success: true, data };
  } catch (err) {
    console.error('[BoatsAI] Eccezione invio documento WhatsApp:', err);
    return { success: false, error: err.message };
  }
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
Il tuo compito è assistere il cliente (${senderName}), rispondere a ogni domanda su barche, yacht, schede tecniche, disponibilità, motorizzazioni e dotazioni, e inviare in allegato la scheda PDF quando richiesta.

CATALOGO BARCHE ATTUALMENTE DISPONIBILI:
${catalogContext || 'Nessuna barca attualmente a catalogo.'}

REGOLE DI COMPORTAMENTO:
1. Sii cordiale, professionale, appassionato di nautica e impeccabile. Usa emoji marittime con eleganza (🚤, ⚓, 🌊, 📋, 🛥️, ✨).
2. Se il cliente chiede informazioni generali sulle barche o cerca barche con specifiche caratteristiche (es. "Quali barche avete?", "Avete qualcosa con 3 cabine?", "Cosa mi consigli per 6 persone?"), rispondi consigliando le barche pertinenti dal catalogo ed elencando brevemente i dettagli chiave (modello, lunghezza, cabine, prezzo).
3. Se il cliente chiede di RICEVERE IN ALLEGATO la scheda / brochure / PDF di una determinata barca (es. "Mandami la scheda della barca xx", "Inviami il pdf", "Vorrei l'allegato dell'Oceanis", "Mi mandi i dettagli in allegato?"):
   - Riconosci la barca richiesta e indica il suo "boatIdToSend".
   - Imposta "sendAttachment": true.
   - Genera un messaggio di accompagnamento ("replyMessage") cordiale in cui confermi che stai inviando la scheda in allegato e riassumi 2-3 caratteristiche salienti.
4. Se il cliente chiede la scheda di una barca che non è in catalogo o il nome è ambiguo, spiega gentilmente quali schede sono disponibili e chiedi conferma.
5. Se non viene richiesto l'allegato (solo domande o saluti), imposta "sendAttachment": false e "boatIdToSend": null.

RISPONDI ESCLUSIVAMENTE con un JSON strutturato così:
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
    temperature: 0.2
  });

  try {
    const parsed = JSON.parse(aiRes.choices[0].message.content);
    return parsed;
  } catch (err) {
    console.error('[BoatsAI] Errore parsing risposta AI barche:', err);
    return {
      replyMessage: "Ciao! Ho ricevuto la tua richiesta sulle barche. Un nostro consulente verificherà la disponibilità delle schede.",
      sendAttachment: false,
      boatIdToSend: null
    };
  }
}
