import React, { useState, useEffect } from 'react';
import styles from './ProjectsView.module.css'; // Possiamo riusare questo CSS per comodità
import { FaSync, FaGoogle } from 'react-icons/fa';

export default function ClientsView({ clients: initialClients, cards = [], onRefresh }) {
  const [clients, setClients] = useState(initialClients);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Campi Form
  const [name, setName] = useState('');
  const [notebookLmUrl, setNotebookLmUrl] = useState('');
  const [claudeUrl, setClaudeUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  
  // Google Sheets Sync
  const [csvUrl, setCsvUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtri
  const [filterActive, setFilterActive] = useState(true);

  useEffect(() => {
    setClients(initialClients);

    // Fetch global settings for CSV URL
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.SHEETS_CSV_URL) setCsvUrl(data.SHEETS_CSV_URL);
    });
  }, [initialClients]);

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setName(c.name || '');
    setNotebookLmUrl(c.notebookLmUrl || '');
    setClaudeUrl(c.claudeUrl || '');
    setNotes(c.notes || '');
    setColor(c.color || '');
    setMergeTargetId('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          notebookLmUrl,
          claudeUrl,
          notes,
          color
        })
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
        alert('Dati cliente salvati con successo!');
        setSelectedClient({ ...selectedClient, name, notebookLmUrl, claudeUrl, notes, color });
      } else {
        alert('Errore durante il salvataggio.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    if (!confirm(`Sei sicuro di voler eliminare definitivamente il cliente "${selectedClient.name}"? Tutte le schede e i progetti ad esso assegnati diventeranno "Senza Cliente".`)) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onRefresh) onRefresh();
        setSelectedClient(null);
        alert('Cliente eliminato!');
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleMerge = async () => {
    if (!selectedClient || !mergeTargetId) return;
    const targetClient = clients.find(c => c.id === mergeTargetId);
    if (!confirm(`Tutte le schede e progetti di "${selectedClient.name}" verranno spostati in "${targetClient.name}". Il cliente "${selectedClient.name}" verrà eliminato. Procedere?`)) return;

    try {
      const res = await fetch('/api/clients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: selectedClient.id, targetId: mergeTargetId })
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
        setSelectedClient(null);
        alert('Clienti uniti con successo!');
      } else {
        alert('Errore durante la fusione.');
      }
    } catch(err) {
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>I Tuoi Clienti ({clients.filter(c => filterActive ? !!c.sheetData : true).length})</h3>
            <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={filterActive} onChange={e => setFilterActive(e.target.checked)} />
              Solo Attivi
            </label>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {clients.filter(c => filterActive ? !!c.sheetData : true).map((c, index) => (
              <li 
                key={c.id} 
                onClick={() => handleSelectClient(c)}
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid var(--border-color)', 
                  cursor: 'pointer',
                  background: selectedClient?.id === c.id ? 'var(--bg-elevated)' : (index % 2 === 0 ? 'transparent' : 'rgba(161, 189, 207, 0.05)'),
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
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 'bold' }}>Nome Cliente</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}
                />
              </div>
              
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
                <label style={{ fontWeight: 'bold' }}>Link Progetto Claude</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="url" 
                    value={claudeUrl} 
                    onChange={e => setClaudeUrl(e.target.value)} 
                    placeholder="https://claude.ai/project/..." 
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                  {claudeUrl && (
                    <a href={claudeUrl} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 1rem', background: '#d97757', color: 'white', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      Apri Claude
                    </a>
                  )}
                </div>
                <small style={{ color: 'var(--text-secondary)' }}>Incolla il link diretto alla chat o al progetto Claude per questo cliente.</small>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 'bold' }}>Colore Riga Bacheca</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={color || '#1E293B'} 
                    onChange={e => setColor(e.target.value)} 
                    style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <small style={{ color: 'var(--text-secondary)' }}>Scegli il colore di sfondo per l'intera riga di questo cliente in KanbanView.</small>
                  <button type="button" onClick={() => setColor('')} style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', cursor: 'pointer', marginLeft: 'auto' }}>
                    Reset Colore
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" style={{ padding: '0.6rem 1.2rem', background: 'var(--accent-primary)', color: 'black', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Salva Informazioni
                </button>
              </div>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />
            
            <h3 style={{ color: 'var(--status-danger)' }}>Zona Pericolosa</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', background: 'rgba(255,0,0,0.05)', padding: '1rem', border: '1px solid rgba(255,0,0,0.2)', borderRadius: '8px' }}>
              
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Unisci a un altro cliente</h4>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sposta tutti i progetti e le schede di questo cliente in un altro cliente, poi elimina questo.</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="">-- Seleziona cliente di destinazione --</option>
                    {clients.filter(c => c.id !== selectedClient.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={handleMerge} disabled={!mergeTargetId} style={{ padding: '0.5rem 1rem', background: 'var(--status-warning)', color: 'white', borderRadius: '4px', border: 'none', cursor: mergeTargetId ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                    Unisci e Elimina
                  </button>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,0,0,0.1)' }} />
              
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Elimina Cliente</h4>
                <button onClick={handleDelete} style={{ padding: '0.5rem 1rem', background: 'var(--status-danger)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  Elimina Definitivamente
                </button>
              </div>

            </div>

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
                        <div style={{ marginTop: '1rem' }}>
                          <strong>Dettaglio Servizi e Collaboratori: </strong>
                          {data.servicesDetails && Object.keys(data.servicesDetails).length > 0 ? (
                            <table style={{ width: '100%', marginTop: '0.5rem', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                              <thead>
                                <tr style={{ background: 'var(--bg-elevated)', textAlign: 'left' }}>
                                  <th style={{ padding: '0.5rem', border: '1px solid var(--border-color)' }}>Servizio</th>
                                  <th style={{ padding: '0.5rem', border: '1px solid var(--border-color)' }}>Collaboratori</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(data.servicesDetails).map(([service, users]) => (
                                  <tr key={service}>
                                    <td style={{ padding: '0.5rem', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>{service}</td>
                                    <td style={{ padding: '0.5rem', border: '1px solid var(--border-color)' }}>
                                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {users.map((u, idx) => (
                                          <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                            {u.name} {u.effort ? <strong style={{ color: 'var(--accent-primary)' }}>({u.effort})</strong> : ''}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Nessun dettaglio servizio disponibile. Sincronizza per aggiornare.</div>
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
