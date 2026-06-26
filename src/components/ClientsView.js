import React, { useState, useEffect } from 'react';
import styles from './ProjectsView.module.css'; // Possiamo riusare questo CSS per comodità

export default function ClientsView({ clients: initialClients, onRefresh }) {
  const [clients, setClients] = useState(initialClients);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Campi Form
  const [notebookLmUrl, setNotebookLmUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setClients(initialClients);
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2>👥 Rubrica e Hub Clienti</h2>
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
          </div>
        )}
      </div>
    </div>
  );
}
