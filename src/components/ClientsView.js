import React, { useState, useEffect } from 'react';
import styles from './ProjectsView.module.css'; // Possiamo riusare questo CSS per comodità
import { FaSync, FaGoogle, FaTrash } from 'react-icons/fa';

export default function ClientsView({ clients: initialClients, cards = [], onRefresh, onOpenNotebook }) {
  const [clients, setClients] = useState(initialClients);
  const [selectedClient, setSelectedClient] = useState(null);
  const [notebookModalClient, setNotebookModalClient] = useState(null);
  
  // Campi Form
  const [name, setName] = useState('');
  const [notebookLmUrl, setNotebookLmUrl] = useState('');
  const [claudeUrl, setClaudeUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('');
  const [status, setStatus] = useState('CLIENTE');
  
  const [mergeTargetId, setMergeTargetId] = useState('');

  const defaultPlan = {
    monday: { post: 0, reel: 0, video: 0, stories: 0 },
    tuesday: { post: 0, reel: 0, video: 0, stories: 0 },
    wednesday: { post: 0, reel: 0, video: 0, stories: 0 },
    thursday: { post: 0, reel: 0, video: 0, stories: 0 },
    friday: { post: 0, reel: 0, video: 0, stories: 0 },
    saturday: { post: 0, reel: 0, video: 0, stories: 0 },
    sunday: { post: 0, reel: 0, video: 0, stories: 0 }
  };
  const [socialPlan, setSocialPlan] = useState(defaultPlan);
  const [pedSheets, setPedSheets] = useState({});
  const [pedMonthStr, setPedMonthStr] = useState('');
  const [pedUrlInput, setPedUrlInput] = useState('');
  const [isSyncingPed, setIsSyncingPed] = useState(false);
  
  // Google Sheets Sync
  const [csvUrl, setCsvUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtri
  const [filterActive, setFilterActive] = useState(true);

  // Expandables
  const [showAI, setShowAI] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

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
    setStatus(c.status || 'CLIENTE');
    setMergeTargetId('');
    try {
      setSocialPlan(c.socialPlan ? JSON.parse(c.socialPlan) : defaultPlan);
    } catch {
      setSocialPlan(defaultPlan);
    }
    try {
      setPedSheets(c.pedSheets ? JSON.parse(c.pedSheets) : {});
    } catch {
      setPedSheets({});
    }
    setPedMonthStr('');
    setPedMonthStr('');
    setPedUrlInput('');
  };

  const handleAddPed = async () => {
    if (!pedMonthStr || !pedUrlInput) return;
    const newPed = { ...(pedSheets || {}), [pedMonthStr]: pedUrlInput };
    setPedSheets(newPed);
    setPedUrlInput('');
    
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedSheets: JSON.stringify(newPed) })
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        alert("Errore durante il salvataggio del link PED.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePed = async (monthToRemove) => {
    const newPed = { ...(pedSheets || {}) };
    delete newPed[monthToRemove];
    setPedSheets(newPed);
    
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedSheets: JSON.stringify(newPed) })
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
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
          color,
          status,
          socialPlan: JSON.stringify(socialPlan),
          pedSheets: JSON.stringify(pedSheets)
        })
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
        alert('Dati cliente salvati con successo!');
        setSelectedClient({ ...selectedClient, name, notebookLmUrl, claudeUrl, notes, color, status, socialPlan: JSON.stringify(socialPlan), pedSheets: JSON.stringify(pedSheets) });
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

  const handleConvertToSupplier = async () => {
    if (!selectedClient) return;
    if (!confirm(`Sei sicuro di voler convertire "${selectedClient.name}" in un Fornitore/Tool? Il cliente verrà rimosso da questa lista e inserito negli Accessi.`)) return;

    try {
      // 1. Create Access
      const resAccess = await fetch('/api/accesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedClient.name,
          notes: selectedClient.notes || '',
          type: 'SUPPLIER',
          showInCard: false
        })
      });

      if (!resAccess.ok) throw new Error('Errore creazione accesso');

      // 2. Delete Client
      const resDel = await fetch(`/api/clients/${selectedClient.id}`, { method: 'DELETE' });
      if (resDel.ok) {
        if (onRefresh) onRefresh();
        setSelectedClient(null);
        alert('Convertito con successo!');
      }
    } catch(err) {
      console.error(err);
      alert('Errore durante la conversione');
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
        alert(`Sincronizzazione completata!\nClienti creati: ${data.results.clientsCreated}\nClienti aggiornati: ${data.results.clientsUpdated}\nNuovi utenti creati: ${data.results.usersCreated}`);
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
                  fontWeight: selectedClient?.id === c.id ? 'bold' : 'normal',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{c.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); if (onOpenNotebook) onOpenNotebook(c); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem', transition: 'transform 0.2s' }}
                  title="Apri Brain (IA)"
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  🧠
                </button>
              </li>
            ))}
            {clients.length === 0 && <p style={{color: 'var(--text-secondary)'}}>Nessun cliente presente.</p>}
          </ul>
        </div>

        {/* Dettagli Cliente Selezionato */}
        {selectedClient && (
          <div style={{ flex: '2 1 500px', background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Nome Cliente</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Stato</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)} 
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.1rem' }}
                  >
                    <option value="CLIENTE">Attivo</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="OBSOLETO">Obsoleto</option>
                  </select>
                </div>

                <button type="submit" style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-primary)', color: 'black', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', marginTop: '1.2rem' }}>
                  Salva Modifiche
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Piano Editoriale Social</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginTop: '0.3rem' }}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const itDays = { monday: 'Lunedì', tuesday: 'Martedì', wednesday: 'Mercoledì', thursday: 'Giovedì', friday: 'Venerdì', saturday: 'Sabato', sunday: 'Domenica' };
                    return (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.3rem' }}>{itDays[day]}</div>
                        {['post', 'reel', 'video', 'stories'].map(type => (
                          <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                            <span style={{textTransform: 'capitalize'}}>{type}</span>
                            <input 
                              type="number" 
                              min="0" 
                              value={socialPlan?.[day]?.[type] || 0} 
                              onChange={e => setSocialPlan(prev => ({...prev, [day]: {...(prev?.[day] || {}), [type]: parseInt(e.target.value) || 0}}))}
                              style={{ width: '30px', padding: '0.1rem', fontSize: '0.75rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '2px', textAlign: 'center' }}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '1rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Piani Editoriali Mensili (Google Sheets)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="month" value={pedMonthStr} onChange={e => setPedMonthStr(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                  <input type="url" placeholder="https://docs.google.com/spreadsheets..." value={pedUrlInput} onChange={e => setPedUrlInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddPed(); } }} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                  <button type="button" onClick={(e) => { e.preventDefault(); handleAddPed(); }} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Aggiungi
                  </button>
                </div>
                {pedSheets && Object.keys(pedSheets).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    {Object.entries(pedSheets).map(([month, url]) => (
                      <div key={month} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '4px' }}>
                        <strong style={{ fontSize: '0.8rem', minWidth: '70px' }}>{month}</strong>
                        <a href={url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--accent-primary)' }}>{url}</a>
                        <button type="button" onClick={async (e) => {
                           e.preventDefault();
                           setIsSyncingPed(true);
                           try {
                             const res = await fetch('/api/sync/ped', {
                               method: 'POST',
                               headers: {'Content-Type': 'application/json'},
                               body: JSON.stringify({ clientId: selectedClient.id, monthKey: month, sheetUrl: url })
                             });
                             const data = await res.json();
                             if (data.success) alert(`Sincronizzazione completata: ${data.syncedCount} post aggiornati.`);
                             else alert('Errore: ' + data.error);
                           } catch (err) { alert('Errore di rete'); }
                           setIsSyncingPed(false);
                        }} disabled={isSyncingPed} style={{ padding: '0.2rem 0.5rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                          {isSyncingPed ? '...' : 'Sincronizza Ora'}
                        </button>
                        <button type="button" onClick={(e) => { e.preventDefault(); handleDeletePed(month); }} style={{ background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', padding: '0.2rem' }}>
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Colore Riga Bacheca</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={color || '#1E293B'} 
                    onChange={e => setColor(e.target.value)} 
                    style={{ width: '30px', height: '30px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <button type="button" onClick={() => setColor('')} style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem', cursor: 'pointer' }}>
                    Reset Colore
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                <div onClick={() => setShowAI(!showAI)} style={{ padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  <span>{showAI ? '−' : '+'}</span>
                  Link Esterni AI
                </div>
                
                {showAI && (
                  <div style={{ padding: '0 0.8rem 0.8rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Progetto NotebookLM</label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input 
                          type="url" 
                          value={notebookLmUrl} 
                          onChange={e => setNotebookLmUrl(e.target.value)} 
                          placeholder="https://notebooklm.google.com/..." 
                          style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                        />
                        {notebookLmUrl && (
                          <a href={notebookLmUrl} target="_blank" rel="noreferrer" style={{ padding: '0.4rem 0.8rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                            Apri
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Progetto Claude</label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input 
                          type="url" 
                          value={claudeUrl} 
                          onChange={e => setClaudeUrl(e.target.value)} 
                          placeholder="https://claude.ai/project/..." 
                          style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                        />
                        {claudeUrl && (
                          <a href={claudeUrl} target="_blank" rel="noreferrer" style={{ padding: '0.4rem 0.8rem', background: '#d97757', color: 'white', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                            Apri
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

            {/* Mostriamo i dati sincronizzati da Google Sheets se presenti */}
            {selectedClient.sheetData && (
              <div style={{ marginBottom: '1.5rem', padding: '0.8rem', background: 'rgba(66, 133, 244, 0.05)', borderRadius: '8px', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#4285F4' }}>
                  <FaGoogle size={14} /> Dati da Fogli Google
                </h3>
                
                {(() => {
                  try {
                    const data = JSON.parse(selectedClient.sheetData);
                    return (
                      <div style={{ fontSize: '0.8rem' }}>
                        {data.servicesDetails && Object.keys(data.servicesDetails).length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {Object.entries(data.servicesDetails).map(([service, users]) => (
                              <div key={service} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-elevated)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                                <strong style={{ minWidth: '100px' }}>{service}:</strong>
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                  {users.map((u, idx) => (
                                    <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                                      {u.name} {u.effort ? <strong style={{ color: 'var(--accent-primary)' }}>({u.effort})</strong> : ''}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-secondary)' }}>Nessun dettaglio servizio disponibile.</div>
                        )}
                      </div>
                    );
                  } catch(e) {
                    return <p style={{ margin: 0, color: 'var(--status-delayed)', fontSize: '0.8rem' }}>Errore parsing dati.</p>;
                  }
                })()}
              </div>
            )}

            {/* Zona Pericolosa */}
            <div style={{ background: 'rgba(255,0,0,0.02)', border: '1px solid rgba(255,0,0,0.1)', borderRadius: '6px' }}>
              <div onClick={() => setShowDanger(!showDanger)} style={{ padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--status-danger)' }}>
                <span>{showDanger ? '−' : '+'}</span>
                Zona Pericolosa
              </div>
              
              {showDanger && (
                <div style={{ padding: '0 0.8rem 0.8rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem' }}>Converti in Fornitore/Tool</h4>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Questo non era un vero cliente? Spostalo nella rubrica degli Accessi ed eliminalo dalla lista clienti.</p>
                    <button onClick={handleConvertToSupplier} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Converti in Fornitore
                    </button>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,0,0,0.1)' }} />

                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem' }}>Unisci a un altro cliente</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                        <option value="">-- Seleziona destinazione --</option>
                        {clients.filter(c => c.id !== selectedClient.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button onClick={handleMerge} disabled={!mergeTargetId} style={{ padding: '0.4rem 0.8rem', background: 'var(--status-warning)', color: 'white', borderRadius: '4px', border: 'none', cursor: mergeTargetId ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Unisci
                      </button>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,0,0,0.1)' }} />
                  
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem' }}>Elimina Cliente</h4>
                    <button onClick={handleDelete} style={{ padding: '0.4rem 0.8rem', background: 'var(--status-danger)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      Elimina Definitivamente
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
