import React, { useState, useEffect } from 'react';
import styles from './ProjectsView.module.css'; // Possiamo riusare questo CSS per comodità
import { FaSync, FaGoogle } from 'react-icons/fa';

export default function ClientsView({ clients: initialClients, cards = [], onRefresh }) {
  const [clients, setClients] = useState(initialClients);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Campi Form
  const [notebookLmUrl, setNotebookLmUrl] = useState('');
  const [notes, setNotes] = useState('');
  
  // Google Sheets Sync
  const [csvUrl, setCsvUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Filtra i clienti per mostrare solo quelli con schede attive se richiesto o se ci sono cards.
    // Oppure mostriamo tutti. Se "cards" sono fornite, calcoliamo i clienti attivi:
    let activeClients = initialClients;
    if (cards && cards.length > 0) {
      activeClients = initialClients.filter(c => 
        cards.some(card => card.clientId === c.id && !card.isArchived && !card.list?.isArchived)
      );
    }
    setClients(activeClients.length > 0 ? activeClients : initialClients);

    // Fetch global settings for CSV URL
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.SHEETS_CSV_URL) setCsvUrl(data.SHEETS_CSV_URL);
    });
  }, [initialClients]);

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setNotebookLmUrl(c.notebookLmUrl || '');
    setNotes(c.notes || '');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookLmUrl,
          notes
        })
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
        alert('Dati cliente salvati con successo!');
      } else {
        alert('Errore durante il salvataggio.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncSheets = async () => {
    if (!csvUrl) return alert("Inserisci il link CSV di Google Sheets");
    
    setIsSyncing(true);
    try {
      // Salva l'URL nelle impostazioni globali
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SHEETS_CSV_URL: csvUrl })
      });

      const res = await fetch('/api/sync/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvUrl })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`Sincronizzazione completata!\\nClienti creati: ${data.results.clientsCreated}\\nClienti aggiornati: ${data.results.clientsUpdated}\\nNuovi utenti creati: ${data.results.usersCreated}`);
        if (onRefresh) onRefresh();
      } else {
        alert("Errore sinc: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Errore di rete durante la sincronizzazione.");
    }
    setIsSyncing(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>👥 Rubrica e Hub Clienti</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <FaGoogle color="#4285F4" />
            <input 
              type="url" 
              placeholder="Link Pubblica sul Web (CSV)"
              value={csvUrl}
              onChange={e => setCsvUrl(e.target.value)}
              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '250px' }}
            />
            <button onClick={handleSyncSheets} disabled={isSyncing} style={{ padding: '0.4rem 0.8rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <FaSync className={isSyncing ? 'fa-spin' : ''} />
              {isSyncing ? 'Sincronizzo...' : 'Sincronizza da Fogli'}
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {/* Lista Clienti */}
        <div style={{ flex: '1 1 300px', background: 'var(--bg-glass)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
          <h3>I Tuoi Clienti ({clients.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
            {clients.map(c => (
              <li 
                key={c.id} 
                onClick={() => handleSelectClient(c)}
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid var(--border-color)', 
                  cursor: 'pointer',
                  background: selectedClient?.id === c.id ? 'var(--bg-elevated)' : 'transparent',
                  fontWeight: selectedClient?.id === c.id ? 'bold' : 'normal'
                }}
              >
                {c.name}
              </li>
            ))}
            {clients.length === 0 && <p style={{color: 'var(--text-secondary)'}}>Nessun cliente presente.</p>}
          </ul>
        </div>

        {/* Dettagli Cliente Selezionato */}
        {selectedClient && (
          <div style={{ flex: '2 1 500px', background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
            <h2>{selectedClient.name}</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 'bold' }}>Link Progetto NotebookLM</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="url" 
                    value={notebookLmUrl} 
                    onChange={e => setNotebookLmUrl(e.target.value)} 
                    placeholder="https://notebooklm.google.com/..." 
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                  {notebookLmUrl && (
                    <a href={notebookLmUrl} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 1rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      Apri NotebookLM
                    </a>
                  )}
                </div>
                <small style={{ color: 'var(--text-secondary)' }}>Incolla il link diretto al progetto NotebookLM per questo cliente.</small>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 'bold' }}>Appunti Veloci / Referenti</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={8} 
                  placeholder="Scrivi qui i contatti, gli accordi principali, i link Drive o altre info utili..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" style={{ padding: '0.6rem 1.2rem', background: 'var(--accent-primary)', color: 'black', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Salva Informazioni
                </button>
              </div>
            </form>

            {/* Mostriamo i dati sincronizzati da Google Sheets se presenti */}
            {selectedClient.sheetData && (
              <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <FaGoogle color="#4285F4" /> Dati Sincronizzati da Fogli Google
                </h3>
                
                {(() => {
                  try {
                    const data = JSON.parse(selectedClient.sheetData);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <strong>Servizi Venduti: </strong>
                          {data.services?.length > 0 ? data.services.map((s, i) => (
                            <span key={i} style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: 'var(--bg-elevated)', borderRadius: '4px', marginRight: '0.5rem', fontSize: '0.85rem' }}>{s}</span>
                          )) : <span style={{ color: 'var(--text-secondary)' }}>Nessun servizio</span>}
                        </div>
                        {data.effort && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <strong>Impegno Registrato: </strong> {data.effort}
                          </div>
                        )}
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong>Collaboratori Assegnati: </strong>
                          {selectedClient.collaborators && selectedClient.collaborators.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                              {selectedClient.collaborators.map(user => {
                                // Match effort to user
                                let userEffort = null;
                                if (data.effort && data.orderedNames) {
                                  const efforts = data.effort.split('-').map(e => e.trim());
                                  const idx = data.orderedNames.findIndex(n => n.toUpperCase() === user.name.toUpperCase());
                                  if (idx >= 0 && idx < efforts.length) {
                                    userEffort = efforts[idx];
                                  }
                                } else if (data.effort && !data.orderedNames && selectedClient.collaborators.length === 1) {
                                  userEffort = data.effort; // Se c'è un solo collaboratore, prende tutto l'effort
                                }

                                return (
                                  <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.25rem 0.5rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                                    {user.avatarUrl ? (
                                      <img src={user.avatarUrl} alt={user.name} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                                    ) : (
                                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontSize: '0.6rem', fontWeight: 'bold' }}>
                                        {user.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span style={{ fontSize: '0.85rem' }}>
                                      {user.name}
                                      {userEffort && <strong style={{ marginLeft: '4px', color: 'var(--accent-primary)' }}>({userEffort})</strong>}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>Nessun collaboratore</span>
                          )}
                        </div>
                      </div>
                    );
                  } catch(e) {
                    return <p style={{ color: 'var(--status-delayed)' }}>Errore di parsing dati sincronizzati.</p>;
                  }
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
