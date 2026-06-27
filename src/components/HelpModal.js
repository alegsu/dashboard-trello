import React from 'react';

export default function HelpModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-secondary)', width: '600px', maxWidth: '90%', maxHeight: '90vh',
        borderRadius: '12px', padding: '2rem', overflowY: 'auto', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>Guida e Automazioni</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.6' }}>
          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Le Basi del Gestionale</h3>
            <p>Benvenuto! Questo gestionale è organizzato in tre livelli principali:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Progetti:</strong> Contenitori generali (es. "Sito Web Cliente X").</li>
              <li><strong>Bacheche:</strong> Gruppi di liste all'interno di un progetto.</li>
              <li><strong>Liste & Schede (Kanban):</strong> Il cuore operativo. Trascina le schede per aggiornarne lo stato.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>✨ Automazioni Attive</h3>
            <p>Abbiamo creato alcune logiche intelligenti per velocizzare il lavoro:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Sincronizzazione Checklist ↔ Liste:</strong> 
                Se sposti una scheda in una colonna chiamata "Fatto" (o "Completato"), tutte le sue checklist verranno spuntate automaticamente. Viceversa, se spunti tutte le voci delle checklist all'interno di una scheda, essa verrà spostata da sola nella colonna "Fatto".
              </li>
              <li>
                <strong>Archiviazione Automatica:</strong> 
                Per tenere pulite le bacheche, ogni notte il sistema verifica se ci sono schede ferme nella lista "Fatto" da più di <strong>7 giorni</strong>. In caso affermativo, le archivia in automatico (non le elimina, potrai sempre ritrovarle nella pagina Progetti archiviati).
              </li>
              <li>
                <strong>Allarme Scadenze (Rosso Lampeggiante):</strong> 
                Se una scheda si avvicina alla scadenza (meno di 24 ore) o l'ha superata, e non si trova ancora nella colonna "Fatto", la data sulla scheda inizierà a <strong>lampeggiare di rosso</strong> per attirare l'attenzione.
              </li>
              <li>
                <strong>Colori Alternati:</strong> 
                Nella vista Kanban e nella Rubrica Clienti, le righe hanno sfondi alternati per capire immediatamente a quale cliente appartiene ciascuna scheda orizzontalmente.
              </li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Menzioni e Notifiche</h3>
            <p>Nei commenti e nelle note delle checklist puoi digitare <code>@</code> per menzionare un collaboratore. Questa persona riceverà un'email di avviso con il link diretto per aprire la scheda e leggere il tuo messaggio!</p>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.8.5)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>🐛 <strong>Fix Banda Scura DEFINITIVO:</strong> Rimosso il background e il height: 100% dal kanbanContainer che causava il doppio gradiente di colore sulle righe dei clienti. Trovato grazie alla segnalazione precisa dell'utente!</li>
              <li>🔧 <strong>Fix Navigazione Impostazioni:</strong> Ora i tab di navigazione (Kanban, Timeline, Progetti, etc.) sono sempre visibili anche nella vista Impostazioni, permettendo di tornare alle altre sezioni.</li>
              <li>📐 <strong>Fix Larghezza Colonne:</strong> Ripristinate le proporzioni corrette delle colonne del Kanban.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.8.4)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>🗜️ <strong>Ricerca a Scomparsa e Riga Singola:</strong> Abbiamo ulteriormente affinato la riga dei filtri: ora la barra di ricerca è una piccola lente d'ingrandimento cliccabile che si espande solo quando ti serve. In questo modo tutte le tue opzioni stanno SEMPRE comodamente su una sola riga, senza mai andare a capo!</li>
              <li>🐛 <strong>Bug Fix Altezza Celle Safari:</strong> Risolto una volta per tutte il problema del disallineamento dei background e delle intestazioni su Safari (il bug per cui in alcune colonne con molte schede il background orizzontale non veniva "allungato" correttamente fino in fondo, generando due fastidiosi "gradienti").</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.8.3)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>🔍 <strong>Zoom Kanban:</strong> Aggiunta l'impostazione "Zoom Vista Kanban" nel pannello Impostazioni & Gestione. Ora puoi regolare lo zoom globale del Kanban per visualizzare più o meno elementi contemporaneamente!</li>
              <li>🗜️ <strong>Interfaccia Super-Compatta:</strong> Le opzioni di vista (Kanban, Timeline, Progetti, etc.) e i filtri di ricerca sono stati tutti compattati in una singola barra superiore per massimizzare lo spazio verticale per il tuo lavoro.</li>
              <li>🐛 <strong>Bug Fix Banda Scura:</strong> Risolto in modo definitivo e assoluto il bug visivo della banda scura/sovrapposizione causato dal rendering dei colori in sovrapposizione in Safari.</li>
              <li>✏️ <strong>Testi Intestazione:</strong> Sostituito "Utente \ Stato" con "Cliente | Stato" come richiesto.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.8.1)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>🎨 <strong>Miglioramento Colori Kanban:</strong> Rimossa l'ombreggiatura scura delle singole celle Kanban per consentire al colore di sfondo del Cliente di risaltare maggiormente e in modo completamente omogeneo su tutta la riga.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.8.0)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>✨ <strong>Gestione Clienti Avanzata:</strong> Ora nella Rubrica Clienti puoi rinominare i clienti, eliminarli definitivamente (spostando schede e progetti su "Senza Cliente") o unirli (spostando tutto su un altro cliente per eliminare i duplicati).</li>
              <li>🎨 <strong>Colori Personalizzati per Cliente:</strong> Puoi assegnare un colore univoco a ciascun cliente. Questo colore riempirà l'intera riga orizzontale di quel cliente nella vista Kanban (Board principale) per un riconoscimento visivo immediato!</li>
              <li>🔗 <strong>Email con Link Corretti:</strong> Introdotta l'impostazione "URL di Produzione" nelle Impostazioni & Gestione, affinché tutte le email automatiche non puntino più a 'localhost' ma all'indirizzo web corretto del gestionale.</li>
              <li>🗑️ <strong>Eliminazione Definitiva da Archivio:</strong> Aggiunto il pulsante "Elimina" nell'Archivio per sbarazzarsi permanentemente di una scheda, oltre all'opzione di ripristino.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.7.0)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>✨ <strong>Migliorie Finestra Progetto:</strong> Ridisegnato completamente il layout del riepilogo Progetto. Ora la finestra è molto più ampia e professionale, i grafici sono visibili chiaramente al centro, e i dettagli accessori (costi, ore, effort) sono in una colonna destra laterale, richiamabili tramite pulsante apposito.</li>
              <li>📊 <strong>Nuovo Grafico Avanzamento (Burn-up):</strong> Il grafico "Roadmap Temporale" ora disegna l'effettiva progressione lineare del lavoro giorno per giorno, partendo dall'inizio del progetto fino alla sua scadenza.</li>
              <li>📈 <strong>Calcolo Percentuale Reale:</strong> La percentuale di completamento del progetto è ora calcolata sul numero di singoli <em>Task</em> e sottotask conclusi (micro-avanzamento), anziché sulle sole schede intere.</li>
              <li>👥 <strong>Team Coinvolto:</strong> Aggiunto nella scheda Progetto un riepilogo visivo (bollini) di tutti i collaboratori impegnati, calcolato in base agli assegnatari di qualsiasi scheda o checklist del progetto.</li>
              <li>⏱️ <strong>Orologio Integrato:</strong> Aggiunta l'indicazione di data e ora correnti nella barra principale in alto, sempre visibile in qualsiasi sezione del gestionale.</li>
              <li>✏️ <strong>Rinomina Titolo Schede:</strong> Aggiunta la possibilità di rinominare in modo rapido il titolo di qualsiasi scheda cliccandoci direttamente sopra all'interno della finestra della scheda.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.6.0)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>✨ <strong>Checklist Avanzate (2 Livelli):</strong> Ora puoi organizzare i tuoi task in modo molto più strutturato. Sotto a ogni voce della checklist puoi creare illimitati "sotto-task" rientrati!</li>
              <li>✏️ <strong>Rinomina Rapida:</strong> Clicca sul titolo di una checklist o sul testo di una voce per rinominarla all'istante, senza doverla cancellare.</li>
              <li>⬆️⬇️ <strong>Riordinamento:</strong> Usa le nuove freccette accanto alle voci per spostarle su o giù e cambiare l'ordine delle tue checklist o dei tuoi task con un solo clic.</li>
              <li>🗑️ <strong>Eliminazione Precisa:</strong> Aggiunti pulsanti dedicati (cestino) per eliminare intere checklist o singole voci in modo pulito.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🚀 Note di Rilascio (v2.5.0)</h3>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>✨ <strong>Lettore di Documenti Migliorato:</strong> L'intelligenza artificiale ora si comporta come un puro "estrattore di dati" fedele al testo, senza inventare o allucinare task standard.</li>
              <li>✨ <strong>Creazione Singola Scheda:</strong> Invece di generare un'intera bacheca, l'AI legge un file (PDF, Word, Excel, CSV) e crea una <strong>singola scheda</strong> altamente dettagliata nella colonna che scegli tu, convertendo i dati in comode checklist interne.</li>
              <li>✨ <strong>Fix di Navigazione AI:</strong> Dopo l'importazione rimani sulla stessa bacheca e visualizzi istantaneamente il risultato.</li>
              <li>🐛 <strong>Bugfix Navigazione e Date:</strong> Risolti i problemi di stabilità nella vista "La Mia Giornata" che bloccavano l'app durante la visualizzazione dei task. Corretta anche l'etichettatura delle scadenze in tale vista.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
