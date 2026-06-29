import React, { useState } from 'react';

export default function HelpModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('guide');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-secondary)', width: '850px', maxWidth: '95%', height: '85vh',
        borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎓</span> Centro Assistenza
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setActiveTab('guide')}
            style={{ 
              flex: 1, padding: '1rem', border: 'none', background: activeTab === 'guide' ? 'var(--bg-secondary)' : 'transparent', 
              color: activeTab === 'guide' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'guide' ? 'bold' : 'normal', borderBottom: activeTab === 'guide' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer', fontSize: '1rem'
            }}
          >
            📖 Guida Dettagliata
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            style={{ 
              flex: 1, padding: '1rem', border: 'none', background: activeTab === 'notes' ? 'var(--bg-secondary)' : 'transparent', 
              color: activeTab === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'notes' ? 'bold' : 'normal', borderBottom: activeTab === 'notes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer', fontSize: '1rem'
            }}
          >
            🚀 Note di Rilascio
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', position: 'relative' }}>
          
          {/* TAB: GUIDA */}
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              {/* Sidebar Menu */}
              <div style={{ flex: '0 0 200px', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Indice</strong>
                <button onClick={() => scrollToSection('g-intro')} style={anchorStyle}>Introduzione</button>
                <button onClick={() => scrollToSection('g-struttura')} style={anchorStyle}>Struttura Dati</button>
                <button onClick={() => scrollToSection('g-flusso')} style={anchorStyle}>Flusso Kanban</button>
                <button onClick={() => scrollToSection('g-clienti')} style={anchorStyle}>Clienti & Colori</button>
                <button onClick={() => scrollToSection('g-automazioni')} style={anchorStyle}>Automazioni</button>
                <button onClick={() => scrollToSection('g-scadenze')} style={anchorStyle}>Scadenze & Notifiche</button>
                <button onClick={() => scrollToSection('g-ai')} style={anchorStyle}>Intelligenza Artificiale</button>
              </div>

              {/* Guide Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
                
                <section id="g-intro" style={sectionStyle}>
                  <h3>Benvenuto su GestionAle</h3>
                  <p>Questo gestionale è progettato per centralizzare il lavoro del tuo team, monitorare l'avanzamento dei progetti e gestire i clienti in un unico posto. L'obiettivo è farti risparmiare tempo tramite automazioni intelligenti e un'interfaccia visiva chiara.</p>
                </section>

                <section id="g-struttura" style={sectionStyle}>
                  <h3>1. Struttura dei Dati</h3>
                  <p>Il sistema è organizzato a "scatole cinesi", dalla più grande alla più piccola:</p>
                  <ul style={ulStyle}>
                    <li><strong>Clienti:</strong> I destinatari finali del lavoro. Li gestisci nella rubrica "Clienti".</li>
                    <li><strong>Progetti:</strong> Contenitori grandi legati a un Cliente (es. "Sito Web", "Campagna Marketing"). Hanno un budget e una data di scadenza.</li>
                    <li><strong>Bacheche:</strong> Spazi di lavoro indipendenti (es. "Sviluppo Tecnico", "Creazione Contenuti").</li>
                    <li><strong>Liste (Colonne):</strong> Rappresentano gli stadi del processo (es. "Da Fare", "In Corso", "Completato").</li>
                    <li><strong>Schede (Task):</strong> Il singolo lavoro da fare. Si trovano dentro le liste e contengono checklist, commenti, allegati e assegnatari.</li>
                  </ul>
                </section>

                <section id="g-flusso" style={sectionStyle}>
                  <h3>2. Il Flusso di Lavoro (Kanban)</h3>
                  <p>La vista principale ("Kanban") ti mostra tutte le bacheche contemporaneamente sotto forma di righe orizzontali divise per cliente.</p>
                  <ul style={ulStyle}>
                    <li><strong>Spostare le schede:</strong> Clicca e tieni premuto su una scheda per trascinarla da una colonna all'altra (es. da "Da Fare" a "In Corso").</li>
                    <li><strong>Dettagli Scheda:</strong> Clicca su una scheda per aprirla. Qui potrai aggiungere descrizioni, assegnare collaboratori, inserire la data di scadenza e creare <em>Checklist</em> a due livelli (task e sotto-task).</li>
                    <li><strong>Rinomina Rapida:</strong> All'interno della scheda, puoi cliccare direttamente sul titolo in alto per rinominarla senza dover usare pulsanti "Modifica".</li>
                  </ul>
                </section>

                <section id="g-clienti" style={sectionStyle}>
                  <h3>3. Clienti & Colori Orizzontali</h3>
                  <p>Nella scheda "Clienti" puoi gestire l'anagrafica. Una funzionalità chiave è l'assegnazione di un <strong>Colore Univoco</strong> al cliente.</p>
                  <ul style={ulStyle}>
                    <li>Quando assegni una scheda a un Cliente, l'intera "riga" orizzontale in cui si trova quella scheda nella vista Kanban prenderà il colore di quel cliente in modo semi-trasparente.</li>
                    <li>Questo ti permette di avere una percezione visiva immediata di <em>chi</em> è il committente di ciascun task guardando il tabellone.</li>
                  </ul>
                </section>

                <section id="g-automazioni" style={sectionStyle}>
                  <h3>4. Automazioni Attive</h3>
                  <p>Il gestionale lavora per te in background:</p>
                  <ul style={ulStyle}>
                    <li><strong>Sincronizzazione Checklist:</strong> Se sposti una scheda nella colonna "Fatto" (o "Completato", "Done"), tutte le checklist al suo interno verranno spuntate automaticamente. Viceversa, se completi manualmente tutte le checklist di una scheda, essa viaggerà da sola verso la colonna "Fatto".</li>
                    <li><strong>Archiviazione Notturna:</strong> Ogni notte, il sistema verifica le schede. Se una scheda si trova nella colonna "Fatto" da oltre 7 giorni, viene nascosta dalla bacheca principale per non fare confusione. Puoi sempre recuperarla (o eliminarla) dalla vista "Impostazioni &gt; Archivio Storico".</li>
                  </ul>
                </section>

                <section id="g-scadenze" style={sectionStyle}>
                  <h3>5. Scadenze e Notifiche (@Menzioni)</h3>
                  <p>Non perderti nessuna scadenza o comunicazione:</p>
                  <ul style={ulStyle}>
                    <li><strong>Rosso Lampeggiante:</strong> Se una scheda ha una scadenza vicina (meno di 24 ore) o è già scaduta, e NON si trova nella colonna "Fatto", la data sulla scheda lampeggerà di rosso.</li>
                    <li><strong>@Menzioni:</strong> Quando scrivi un commento in una scheda, digita <code>@</code> seguito dal nome di un collega. Riceverà immediatamente un'email con un link per aprire la scheda e risponderti.</li>
                    <li><strong>Notifiche Generali:</strong> Dal pannello Impostazioni, ogni utente può scegliere se ricevere email quando viene assegnato a un task, a una lista intera o per il riepilogo giornaliero (che arriva al mattino).</li>
                  </ul>
                </section>

                <section id="g-ai" style={sectionStyle}>
                  <h3>6. Intelligenza Artificiale</h3>
                  <p>GestionAle include assistenti AI per velocizzare i processi (attivabili dalle Impostazioni):</p>
                  <ul style={ulStyle}>
                    <li><strong>Generatore Checklist:</strong> Chiedi all'AI di spezzare un task complesso in sotto-task semplicemente descrivendolo nella scheda.</li>
                    <li><strong>Status Report:</strong> Nella vista Progetti, l'AI può leggere tutte le schede e generare un rapporto discorsivo professionale per il cliente.</li>
                    <li><strong>Lettura Documenti:</strong> Puoi caricare un file PDF o Excel. L'AI leggerà il contenuto e creerà automaticamente una scheda super-dettagliata con le checklist necessarie ad evadere la richiesta del documento.</li>
                  </ul>
                </section>

              </div>
            </div>
          )}

          {/* TAB: NOTE RILASCIO */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingBottom: '2rem' }}>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.13.0</h4>
                <ul style={noteUlStyle}>
                  <li>⚡ <strong>Sincronizzazione in Tempo Reale:</strong> La bacheca Kanban e le schede ora si aggiornano automaticamente ogni 10 secondi "dietro le quinte". Vedrai il lavoro dei tuoi colleghi materializzarsi sullo schermo senza mai dover ricaricare la pagina!</li>
                  <li>🛡️ <strong>Modifiche Sicure:</strong> Quando stai digitando una descrizione o stai compilando una checklist, l'aggiornamento automatico non ti farà perdere il focus né i dati non salvati.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.12.0</h4>
                <ul style={noteUlStyle}>
                  <li>📅 <strong>Recap Giornaliero Migliorato:</strong> La mail del buongiorno ora include una suddivisione chiara tra le task in scadenza oggi (o già scadute) e quelle in scadenza domani.</li>
                  <li>🏷️ <strong>Dettagli Task nella Mail:</strong> Aggiunte le etichette di priorità, i clienti e le date di scadenza esatte direttamente nella lista delle cose da fare.</li>
                  <li>⏰ <strong>Orario di Invio:</strong> Il recap mattutino ora viene inviato esattamente alle 9:10 (fuso orario di Roma) per allinearsi perfettamente all'inizio della giornata lavorativa.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.11.0</h4>
                <ul style={noteUlStyle}>
                  <li>📬 <strong>Rate Limiting Email:</strong> Basta caselle di posta intasate! Il sistema ora raggruppa le notifiche e invia al massimo un'email riassuntiva ogni 3 ore per ciascun utente. Le notifiche intermedie rimangono in coda finché non scade il tempo.</li>
                  <li>➕ <strong>Creazione Rapida Cliente:</strong> Aggiunto un comodo pulsante "+" direttamente nella cella "Cliente | Stato" della vista Kanban. Cliccandolo, puoi inserire istantaneamente il nome di un nuovo cliente senza dover passare dalle impostazioni!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.10.0</h4>
                <ul style={noteUlStyle}>
                  <li>🤖 <strong>Task via Email (Inbound):</strong> Inoltra o invia email a `assistente@gestionale.shinyup.it`! Il gestionale riceverà le mail, l'AI estrarrà il testo in automatico e creerà una scheda (con le eventuali liste di To-Do) nel Progetto/Cliente corretto.</li>
                  <li>🏷️ <strong>Etichetta "DA MAIL":</strong> Le schede create in automatico dall'assistente AI tramite l'inoltro email verranno contrassegnate automaticamente da un'etichetta azzurra "DA MAIL" per un rapido riconoscimento.</li>
                  <li>💨 <strong>Eliminazione Schede Istantanea:</strong> Migliorata la reattività della board Kanban. Quando archivi o elimini una scheda, scompare istantaneamente dalla vista senza dover ricaricare la pagina manualmente.</li>
                </ul>
              </div>
              
              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.9.2</h4>
                <ul style={noteUlStyle}>
                  <li>📈 <strong>Grafici Storici Reali:</strong> La Roadmap Temporale dei Progetti ora traccia i completamenti reali giorno per giorno, mostrando il vero avanzamento storico invece di una stima lineare. <em>Nota: le schede e i task vecchi appariranno raggruppati alla data di oggi, ma i prossimi avanzamenti saranno tracciati precisamente nel giorno in cui vengono eseguiti!</em></li>
                  <li>📅 <strong>Giorni Lavorativi per Scadenze:</strong> Ottimizzato il calcolo dei giorni rimanenti nei progetti per conteggiare solo i giorni feriali (lunedì-venerdì) ed escludere i weekend.</li>
                  <li>📊 <strong>Grafici Puliti:</strong> Rimossa la riga inutile "Ideale" dai grafici di progetto per dare più risalto al solo andamento Reale.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.9.1</h4>
                <ul style={noteUlStyle}>
                  <li>🔗 <strong>Finestra Scheda Globale:</strong> Ora se clicchi su una scheda dalla vista Progetti o da La Mia Giornata, la scheda si apre istantaneamente in sovraimpressione senza farti perdere la vista in cui ti trovi!</li>
                  <li>✉️ <strong>Link Email Corretti:</strong> Sistemati i formati dei link nelle notifiche email. <em>Nota: affinché i link puntino al gestionale corretto e non a localhost, è necessario salvare l'URL di Produzione nel pannello Impostazioni.</em></li>
                  <li>💬 <strong>Messaggi Email Puliti:</strong> Migliorata la formattazione dei messaggi di notifica email per essere più comprensibili.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.9.0</h4>
                <ul style={noteUlStyle}>
                  <li>🗑️ <strong>Elimina dall'Archivio:</strong> I pulsanti "Elimina" (bacheche, liste, progetti, schede) ora cancellano definitivamente dal DB.</li>
                  <li>🗜️ <strong>Impostazioni Compatte:</strong> Ridisegnata la pagina Impostazioni: meno spazi, testi concisi, tutto in una vista.</li>
                  <li>📖 <strong>Guida Dettagliata:</strong> Introdotta questa sezione manuale completa, divisa in schede logiche e navigabile.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.8.5</h4>
                <ul style={noteUlStyle}>
                  <li>🐛 <strong>Fix Banda Scura DEFINITIVO:</strong> Rimosso background dal kanbanContainer che causava il doppio gradiente sui clienti.</li>
                  <li>🔧 <strong>Navigazione Impostazioni:</strong> Tab principali sempre visibili anche nelle Impostazioni.</li>
                  <li>📐 <strong>Larghezza Colonne:</strong> Ripristinate le proporzioni corrette (flex: 1) nel Kanban.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.8.4</h4>
                <ul style={noteUlStyle}>
                  <li>🗜️ <strong>Ricerca Compatta:</strong> Barra di ricerca ridotta a lente espandibile. Tutte le opzioni stanno su singola riga.</li>
                  <li>🐛 <strong>Fix Altezza Safari:</strong> Risolto disallineamento background/header nelle colonne lunghe su Safari.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.8.3</h4>
                <ul style={noteUlStyle}>
                  <li>🔍 <strong>Zoom Kanban:</strong> Nuovo slider nelle Impostazioni per ingrandire/ridurre gli elementi nel Kanban.</li>
                  <li>🗜️ <strong>Barra Super-Compatta:</strong> Filtri e bottoni raggruppati per salvare spazio verticale.</li>
                  <li>✏️ <strong>Testi Intestazione:</strong> Sostituito "Utente \ Stato" con "Cliente | Stato".</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.8.0 - v2.8.1</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>Gestione Clienti:</strong> Rinomina, elimina, unisci clienti.</li>
                  <li>🎨 <strong>Colori Cliente:</strong> Assegnazione colore orizzontale su Kanban per riconoscimento immediato.</li>
                  <li>🔗 <strong>URL Produzione Email:</strong> Link notifiche corretti tramite impostazione URL base.</li>
                  <li>🎨 <strong>Ombreggiatura Celle:</strong> Rimossa ombra scura per omogeneità del colore cliente sulla riga.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.7.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>Finestra Progetto:</strong> Ridisegnato layout con colonna dettagli destra.</li>
                  <li>📊 <strong>Burn-up Chart:</strong> Il grafico roadmap mostra il vero avanzamento lineare verso scadenza.</li>
                  <li>📈 <strong>Percentuale Reale:</strong> Calcolo su micro-task conclusi, non solo su schede intere.</li>
                  <li>👥 <strong>Team Coinvolto:</strong> Avatar visivi dei collaboratori nella finestra progetto.</li>
                  <li>⏱️ <strong>Orologio Integrato:</strong> Data e ora sempre visibili nell'header in alto.</li>
                  <li>✏️ <strong>Rinomina Inline:</strong> Modifica rapida titolo scheda cliccandoci sopra.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.6.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>Checklist a 2 Livelli:</strong> Supporto per infiniti sotto-task indentati.</li>
                  <li>✏️ <strong>Rinomina Rapida:</strong> Clic per rinominare voci checklist istantaneamente.</li>
                  <li>⬆️⬇️ <strong>Riordinamento:</strong> Frecce per muovere voci su/giù.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.5.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>AI Documenti:</strong> L'AI legge PDF/Excel e genera una SINGOLA scheda super-dettagliata con checklist, limitando le allucinazioni.</li>
                  <li>🐛 <strong>Bugfix Mia Giornata:</strong> Ripristinata la visualizzazione corretta delle scadenze e fix crash.</li>
                </ul>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Stili condivisi
const anchorStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--accent-primary)',
  textAlign: 'left',
  padding: '0.3rem 0',
  cursor: 'pointer',
  fontSize: '0.85rem',
  textDecoration: 'underline',
  textUnderlineOffset: '2px'
};

const sectionStyle = {
  scrollMarginTop: '20px'
};

const ulStyle = {
  paddingLeft: '1.2rem',
  marginTop: '0.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  fontSize: '0.9rem',
  color: 'var(--text-secondary)'
};

const noteCardStyle = {
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '0.8rem 1rem'
};

const noteHeaderStyle = {
  margin: '0 0 0.5rem 0',
  color: 'var(--text-primary)',
  fontSize: '1rem'
};

const noteUlStyle = {
  margin: 0,
  paddingLeft: '1.2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  fontSize: '0.85rem',
  color: 'var(--text-secondary)'
};
