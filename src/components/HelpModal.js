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
                <h4 style={noteHeaderStyle}>🚀 v2.34.1</h4>
                <ul style={noteUlStyle}>
                  <li>📈 <strong>Miglioramento KPI Produttività:</strong> Sistemato il conteggio dei task "Completati". Ora il sistema include nel calcolo anche i task storici che sono stati successivamente archiviati per pulizia della bacheca, fornendo un report di performance reale e non al ribasso.</li>
                  <li>⏱️ <strong>Nuovo KPI "In Ritardo":</strong> Aggiunto un nuovo indicatore rosso che segnala immediatamente quante schede attualmente in carico all'utente hanno superato la data di scadenza.</li>
                  <li>🐛 <strong>Fix Resoconto Tempo Giornaliero:</strong> Risolto un bug visivo nel pannello Management che mostrava come "Loggato Oggi" l'ultimo tempo registrato settimane fa per gli utenti inattivi. Ora, se l'utente non entra nel giorno corrente, il contatore giornaliero mostrerà correttamente zero.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.34.0</h4>
                <ul style={noteUlStyle}>
                  <li>📱 <strong>Modalità Mobile Responsiva:</strong> L'app è ora completamente ottimizzata per schermi piccoli! Header compatto con menu ad Hamburger, bacheca Kanban con scorrimento laterale "Swipe" colonna per colonna, e modali delle schede a schermo intero. Finalmente GestionAle comodissimo anche in mobilità!</li>
                  <li>🏆 <strong>Nuovi KPI nel Management:</strong> Aggiunta una nuova sezione "Produttività (Completati)" nel pannello Admin, per visualizzare non solo il carico operativo attivo, ma anche i task, i progetti e le schede completati da ciascun utente.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.33.1</h4>
                <ul style={noteUlStyle}>
                  <li>🐛 <strong>Hotfix Memoria Bacheca:</strong> Corretto un conflitto che resettava l'ultima bacheca visitata ogni volta che si ricaricava la pagina. Ora la memoria locale funziona correttamente!</li>
                  <li>🧠 <strong>Memoria Bacheca Preferita:</strong> Ora il gestionale si ricorda qual è l'ultima bacheca che stavi visualizzando, e te la riaprirà in automatico al prossimo accesso! Niente più aperture forzate sulla bacheca "Plan 2027" se stai lavorando su "Produzione".</li>
                  <li>🐛 <strong>Fix Menzioni (Falsi Positivi):</strong> Abbiamo sistemato il sistema di menzioni (@). Prima, menzionando "@ale", il sistema notificava erroneamente tutti gli utenti che si chiamavano Alessandro, Alessio, o che avevano un nome che iniziava per Ale. Ora le menzioni sono precise e notificano solo la persona esatta!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.32.0</h4>
                <ul style={noteUlStyle}>
                  <li>📊 <strong>Avanzamento Task nelle Anteprime:</strong> Ora puoi vedere a colpo d'occhio l'avanzamento dei lavori direttamente nelle schede della bacheca (e nella sezione "La Mia Giornata")! Se una scheda contiene una o più checklist, apparirà una barra di progresso e il conteggio dei task completati, per un colpo d'occhio immediato.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.31.1</h4>
                <ul style={noteUlStyle}>
                  <li>✅ <strong>Fix Clonazione Schede:</strong> Risolto un fastidioso bug per cui, copiando una scheda, i sottotask delle checklist perdevano la loro gerarchia (diventando tutti task principali). Ora la clonazione preserva perfettamente tutto l'albero di dipendenze!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.31.0</h4>
                <ul style={noteUlStyle}>
                  <li>🏢 <strong>Bacheche Interne (Agenzia):</strong> Ora puoi configurare una bacheca come "Interna" dalle Impostazioni! Selezionando questa modalità, la bacheca nasconderà completamente la logica dei Clienti e dei Progetti, fondendo tutte le schede in un'unica vista pulita. Perfetto per la gestione interna di ShinyUp!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.30.2</h4>
                <ul style={noteUlStyle}>
                  <li>👥 <strong>Fix Assegnazione Utenti alle Bacheche:</strong> Risolto un fastidioso bug (effetto race-condition) che rendeva impossibile assegnare velocemente più utenti a una nuova bacheca. Ora i click multipli vengono registrati istantaneamente e in parallelo!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.30.1</h4>
                <ul style={noteUlStyle}>
                  <li>⏱️ <strong>Fix Tracciamento Tempi:</strong> Risolto un bug che faceva lievitare il tempo "Loggato" all'infinito se si lasciava la scheda aperta nel weekend. Ora il sistema rileva l'inattività: se non tocchi il mouse o la tastiera per più di 5 minuti, il conteggio del tempo viene temporaneamente messo in pausa in modo intelligente!</li>
                  <li>🐛 <strong>Fix Reset Mezzanotte:</strong> Corretto un problema tecnico che causava la sovrapposizione errata dei tempi "Attivo" del giorno precedente a causa del fuso orario del server.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.30.0</h4>
                <ul style={noteUlStyle}>
                  <li>☁️ <strong>Upload Nativo Allegati:</strong> Ora puoi caricare file, immagini e documenti direttamente dal tuo computer all'interno delle schede. I file vengono salvati su Vercel Blob.</li>
                  <li>🧹 <strong>Pulizia Automatica Storage:</strong> Aggiunta l'eliminazione a cascata: quando elimini un allegato, una scheda o un'intera bacheca, tutti i file fisici collegati verranno automaticamente distrutti da Vercel Blob per liberare spazio!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.29.2</h4>
                <ul style={noteUlStyle}>
                  <li>🙋‍♂️ <strong>Filtro Diretto "I Miei Task":</strong> Aggiunto un comodissimo pulsante rapido vicino a "La Mia Giornata" che ti permette, con un solo click, di filtrare l'intera visuale Kanban mostrando esclusivamente le schede in cui sei coinvolto tu!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.29.1</h4>
                <ul style={noteUlStyle}>
                  <li>📐 <strong>Allineamento Perfetto:</strong> Rese le colonne della bacheca Kanban a larghezza fissa per garantire un allineamento millimetrico perfetto tra intestazioni e celle in ogni situazione.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.29.0</h4>
                <ul style={noteUlStyle}>
                  <li>🦄 <strong>Temi Divertenti & Animati:</strong> Aggiunti tre nuovi temi per personalizzare la tua esperienza (Unicorno Magico, Palloncini in Festa, Tramonto Rilassante). Provali nelle Impostazioni!</li>
                  <li>👤 <strong>Assegnatari Visibili in Kanban:</strong> Ora puoi vedere immediatamente chi sta lavorando a una scheda grazie all'icona assegnatario che appare direttamente nell'anteprima della scheda in bacheca.</li>
                </ul>
              </div>
              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.28.0</h4>
                <ul style={noteUlStyle}>
                  <li>🧹 <strong>Pulizia Menu:</strong> Rimossa la modalità "Zen" (poco utilizzata) e spostato il pulsante Archivio nel pannello Impostazioni per avere una navigazione molto più chiara e pulita.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.27.0</h4>
                <ul style={noteUlStyle}>
                  <li>📣 <strong>Bacheca Annunci:</strong> Aggiunto un nuovo sistema di annunci globale per il team. Gli amministratori possono pubblicare comunicazioni dalla sezione Impostazioni. Quando c'è un nuovo annuncio non letto, l'icona del Megafono in alto lampeggerà! Cliccando l'icona si accede allo storico di tutte le vecchie comunicazioni.</li>
                  <li>📘 <strong>Manuale Operativo:</strong> È stato redatto un manuale operativo completo per l'utilizzo del gestionale.</li>
                </ul>
              </div>
              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.26.2</h4>
                <ul style={noteUlStyle}>
                  <li>🗓️ <strong>Fix Date:</strong> Risolto il fastidioso problema che impediva di digitare correttamente l'anno nelle date di scadenza delle schede. Ora l'aggiornamento avviene solo al "click fuori" dal campo, permettendo una digitazione fluida. È stata anche resa visibile l'icona nativa del calendario che spariva con il tema scuro!</li>
                  <li>✉️ <strong>Notifiche Potenziate:</strong> Le email di notifica ora riportano chiaramente il nome di chi ha aggiunto la scheda, e (ovviamente) evitano di inviare la notifica a chi ha appena compiuto l'azione. Addio doppioni automatici!</li>
                </ul>
              </div>
              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.26.1</h4>
                <ul style={noteUlStyle}>
                  <li>💅 <strong>Restyling Calendario Social:</strong> Aggiunta una legenda discreta in alto. I colori degli stati ora sono molto più chiari e intuitivi (verde acceso per i Programmati, verde tenue per le Bozze, arancione per Da Fare). Le etichette dei social network (es. IG/FB, TikTok) non sono più rosse per evitare l'effetto "alert".</li>
                  <li>🔍 <strong>Dettagli completi nel Post:</strong> L'importazione dal PED ora aggrega e mostra direttamente all'interno della scheda del post tutte le sezioni disponibili: Topic, Eventi, Foto e Contenuto. Cliccando sulla scheda, hai finalmente il controllo visivo totale su ciò che devi pubblicare.</li>
                </ul>
              </div>
              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.26.0</h4>
                <ul style={noteUlStyle}>
                  <li>⏱️ <strong>Tempo Loggato vs Tempo Attivo:</strong> Il sistema ora distingue il tempo in cui si ha la pagina aperta dal tempo in cui si interagisce attivamente con il gestionale (movimento mouse, scroll, tastiera). Nel pannello di Gestione è possibile visualizzare entrambe le metriche affiancate.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.25.0</h4>
                <ul style={noteUlStyle}>
                  <li>🔍 <strong>Ricerca Accessi e Pulizia Nomi:</strong> La dicitura "Appunti:" è stata rimossa per rendere i nomi degli accessi più puliti. Inoltre, per facilitare la navigazione, è stata aggiunta una <strong>nuova barra di ricerca</strong> nella schermata Accessi che permette di cercare istantaneamente per nome dell'accesso, note contenute o nome del cliente associato.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.24.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>UI Scheda Cliente Migliorata:</strong> Ulteriore ottimizzazione del layout del cliente. Il pulsante di "Salva Modifiche" è stato spostato in alto a destra per maggiore comodità, la visualizzazione dei dati sincronizzati da Fogli Google è stata compattata ed evidenziata per occupare meno spazio mantenendo chiarezza, e la sezione Appunti Veloci è stata definitivamente migrata: tutti i vecchi appunti sono stati salvati come "Accessi" e uniti alla gestione rubrica. E ovviamente, l'intera "Zona Pericolosa" è stata portata in fondo alla scheda!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.23.0</h4>
                <ul style={noteUlStyle}>
                  <li>📊 <strong>Tracciamento Attività Utenti:</strong> Nel pannello "Management" le statistiche dei collaboratori sono state potenziate. Ora è possibile vedere, oltre agli accessi totali e al tempo complessivo speso, anche il <strong>tempo di utilizzo specifico di "Oggi"</strong> per capire meglio l'utilizzo quotidiano della piattaforma.</li>
                  <li>💅 <strong>UI Impostazioni Cliente:</strong> Ridisegnato il layout della scheda impostazioni Cliente. I link di intelligenza artificiale (Claude e NotebookLM) e la "Zona Pericolosa" sono stati raggruppati in sezioni espandibili per evitare clic accidentali e mantenere un'interfaccia più pulita. Il Piano Editoriale Social è stato spostato più in alto per un accesso più rapido.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.22.0</h4>
                <ul style={noteUlStyle}>
                  <li>🗑️ <strong>Rimozione Timeline:</strong> La scheda Timeline è stata dismessa per semplificare l'interfaccia e concentrare l'attenzione sul nuovo Calendario Social e sulla vista Kanban.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.21.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>Modale Social Post:</strong> I post social non sono più semplici riquadri! Cliccando su un post nel calendario (senza trascinarlo) si aprirà un nuovo Modale dove potrai impostarne lo stato, scrivere note/copy ed entrare in discussione con il team tramite commenti, proprio come per le schede Kanban.</li>
                  <li>🎨 <strong>Stati e Colori Intelligenti:</strong> Assegnando uno stato al post (es. In Approvazione, Programmato, Saltato) la schedina nel calendario assumerà colorazioni o animazioni specifiche per darti un feedback visivo immediato a colpo d'occhio.</li>
                  <li>🗑️ <strong>Eliminazione di Massa Intelligente:</strong> Di fianco al pulsante "Genera mese" è stato inserito un cestino rosso. Questo pulsante è in grado di leggere i filtri attivi in quel momento: svuoterà solo i post della settimana corrente, dell'intero mese o del singolo cliente selezionato, chiedendo sempre conferma prima!</li>
                  <li>⬆️ <strong>Menu di Navigazione:</strong> Il pulsante Social è stato promosso in seconda posizione, subito dopo Kanban, per facilitarne l'accesso.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.20.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>Filtri Calendario Social:</strong> Aggiunti filtri per Cliente e per Utente nel Calendario Social per una visualizzazione mirata dei post!</li>
                  <li>✨ <strong>Sincronizzazione Social su "La mia giornata":</strong> Ora i post social assegnati a te compaiono direttamente nella vista "La mia giornata" se sono previsti per la data odierna.</li>
                  <li>✨ <strong>Drag & Drop Social Calendario:</strong> Trasforma i piani editoriali in post effettivi generandoli mese per mese, dopodiché potrai trascinarli liberamente nel calendario per riprogrammarli!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.19.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>Calendario Social Unificato:</strong> È nata una nuova area! Nel menu principale troverai la nuova scheda "Social". Si tratta di un calendario (Mensile/Settimanale) dove atterrano in automatico le scadenze ricorrenti di tutti i clienti.</li>
                  <li>✨ <strong>Piano Editoriale per Cliente:</strong> Ora nella scheda <em>Clienti</em> puoi impostare quante volte a settimana un cliente pubblica (Post, Reel, Storie, Video) distribuendoli nei giorni dal Lunedì alla Domenica. Il Calendario Social leggerà questi dati e posizionerà da solo i riquadri riepilogativi!</li>
                  <li>🐛 <strong>Fix Recap Giornaliero:</strong> Risolto il problema che impediva l'invio corretto della mail riepilogativa mattutina su Vercel. Ora le scadenze orfane e i task sprovvisti di assegnatario non bloccheranno l'invio.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.18.0</h4>
                <ul style={noteUlStyle}>
                  <li>✨ <strong>Estrazione Automatica Checklist:</strong> Nel dettaglio delle schede, accanto al titolo "Descrizione", è comparso un nuovo pulsante magico. Cliccandolo, l'Intelligenza Artificiale leggerà la descrizione (es. appunti di una call presi al volo) ed estrarrà in automatico una lista pulita di azioni da svolgere, creando una Checklist pronta all'uso!</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.17.0</h4>
                <ul style={noteUlStyle}>
                  <li>🧠 <strong>Brain (Knowledge Base AI):</strong> Nuovo sistema "Brain" per ogni cliente. Una memoria virtuale alimentata dall'IA che archivia in modo permanente appunti, testi e meeting. Cliccando sull'icona potrai chattare con l'assistente che risponderà alle tue domande basandosi esclusivamente sulla conoscenza caricata (no allucinazioni).</li>
                  <li>📬 <strong>Integrazione Email-to-Brain:</strong> Qualsiasi testo, appunti o riassunto di call (anche da bot come Gemini) inviato via email a GestionAle verrà analizzato dalla nostra IA generale che, riconoscendo il riassunto, lo inietterà automaticamente e silenziosamente nel Brain del cliente giusto!</li>
                  <li>🗂️ <strong>Accesso Rapido UI:</strong> Aggiunta l'icona "🧠 Brain" in posizioni strategiche per arrivarci in un clic senza perdere tempo: a fianco del nome cliente nella vista Kanban, in alto a destra nel dettaglio delle singole task, e ovviamente nell'anagrafica Clienti.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.16.0</h4>
                <ul style={noteUlStyle}>
                  <li>👑 <strong>Dashboard Management:</strong> Nuova scheda riservata esclusivamente agli amministratori, dedicata al monitoraggio delle prestazioni, dei login e del carico di lavoro del team (Task, Sottotask, Bacheche, Clienti e Progetti).</li>
                  <li>🌡️ <strong>Termometro Scadenze Kanban:</strong> Ridisegnata la UI delle date di scadenza nelle schede Kanban. Ora includono un "termometro" visivo e un'etichetta di conto alla rovescia (es. "2 gg") che evidenzia in modo molto più chiaro e immediato l'urgenza della task.</li>
                  <li>📧 <strong>Link Corretti nelle Notifiche:</strong> Risolto un bug che inseriva link errati nelle email automatiche. Ora il sistema individua automaticamente il dominio di produzione corretto.</li>
                  <li>☑️ <strong>Assegnazione Clienti Migliorata:</strong> Trasformato il menu di selezione Clienti in una comoda lista di checkbox, permettendo di salvare credenziali e accessi senza dover forzatamente assegnare un cliente.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.15.0</h4>
                <ul style={noteUlStyle}>
                  <li>👥 <strong>Collaboratori sui Progetti:</strong> È ora possibile assegnare i collaboratori direttamente ai Progetti tramite l'apposito modulo. Gli avatar saranno visibili nelle schede progetto.</li>
                  <li>📊 <strong>Analisi Carico Lavoro Avanzata:</strong> Nel pannello Impostazioni, la sezione "Gestione Team" mostra ora mini-istogrammi grafici che evidenziano istantaneamente il peso del lavoro (Schede, Task, Progetti e Clienti) rispetto agli altri membri del team.</li>
                  <li>🔍 <strong>Dettaglio Effort Clienti:</strong> Cliccando sulla riga di un collaboratore nelle Impostazioni, si espande una vista con la lista dei Clienti assegnati (dedotta dai Google Sheet) e il relativo Effort (%).</li>
                  <li>✏️ <strong>Modifica Rapida Utenti:</strong> Gli Admin possono ora modificare al volo "Nome" e "Email" di un membro del team senza doverlo ricreare.</li>
                </ul>
              </div>

              <div style={noteCardStyle}>
                <h4 style={noteHeaderStyle}>🚀 v2.14.0</h4>
                <ul style={noteUlStyle}>
                  <li>🤖 <strong>Integrazione Claude AI:</strong> Nelle impostazioni dei Clienti (anagrafica) è ora presente un campo per inserire il link diretto al Progetto Claude specifico per quel cliente.</li>
                  <li>🔗 <strong>Accesso Rapido da Kanban:</strong> Se a un cliente è stato assegnato un link Claude, su tutte le sue schede nel tabellone Kanban apparirà un comodo pulsantino "🤖 Claude" accanto alla data di scadenza. Ti basterà un clic per atterrare istantaneamente nella chat corretta di quell'assistente!</li>
                </ul>
              </div>

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
