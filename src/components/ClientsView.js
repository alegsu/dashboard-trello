import React, { useState, useEffect } from 'react';
import styles from './ProjectsView.module.css'; // Possiamo riusare questo CSS per comodità
import { FaSync, FaGoogle, FaTrash } from 'react-icons/fa';

export default function ClientsView({ clients: initialClients, cards = [], members = [], onRefresh, onOpenNotebook }) {
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
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState([]);
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  
  // Vista Tabella / Matrice
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('ALL');
  const [tableCollaboratorFilter, setTableCollaboratorFilter] = useState(null);
  const [tableMode, setTableMode] = useState('matrix'); // 'matrix' | 'list'
  const [updatingAssignmentKey, setUpdatingAssignmentKey] = useState(null);
  
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
    if (selectedClient) {
      const freshSelected = (initialClients || []).find(c => c.id === selectedClient.id);
      if (freshSelected) {
        setSelectedClient(freshSelected);
        setSelectedCollaboratorIds((freshSelected.collaborators || []).map(u => u.id));
      }
    }

    // Fetch global settings for CSV URL
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.SHEETS_CSV_URL) setCsvUrl(data.SHEETS_CSV_URL);
    });
  }, [initialClients]);

  const toggleCollaborator = (userId) => {
    setSelectedCollaboratorIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllCollaborators = () => {
    setSelectedCollaboratorIds((members || []).map(m => m.id));
  };

  const deselectAllCollaborators = () => {
    setSelectedCollaboratorIds([]);
  };

  const handleToggleAssignmentInTable = async (client, userId) => {
    const key = `${client.id}-${userId}`;
    setUpdatingAssignmentKey(key);

    const currentIds = (client.collaborators || []).map(u => u.id);
    const isCurrentlyAssigned = currentIds.includes(userId);
    const newIds = isCurrentlyAssigned
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];

    const targetMember = (members || []).find(m => m.id === userId);
    const updatedCollaborators = isCurrentlyAssigned
      ? (client.collaborators || []).filter(u => u.id !== userId)
      : [...(client.collaborators || []), targetMember].filter(Boolean);

    const updatedClient = {
      ...client,
      collaborators: updatedCollaborators
    };

    setClients(prev => (prev || []).map(c => c.id === client.id ? updatedClient : c));
    if (selectedClient?.id === client.id) {
      setSelectedClient(updatedClient);
      setSelectedCollaboratorIds(newIds);
    }

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborators: newIds })
      });
      if (!res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
      if (onRefresh) onRefresh();
    } finally {
      setUpdatingAssignmentKey(null);
    }
  };

  const openClientDetailsFromTable = (client) => {
    handleSelectClient(client);
    setViewMode('cards');
  };

  const getClientActiveCardsCount = (clientId) => {
    return (cards || []).filter(card => card.clientId === clientId && !card.isArchived).length;
  };

  const filteredTableClients = clients.filter(c => {
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchCollaborator = (c.collaborators || []).some(u => (u.name || '').toLowerCase().includes(q));
      if (!matchName && !matchCollaborator) return false;
    }

    if (tableStatusFilter !== 'ALL') {
      if ((c.status || 'CLIENTE') !== tableStatusFilter) return false;
    }

    if (tableCollaboratorFilter === 'UNASSIGNED') {
      if ((c.collaborators || []).length > 0) return false;
    } else if (tableCollaboratorFilter) {
      if (!(c.collaborators || []).some(u => u.id === tableCollaboratorFilter)) return false;
    }

    return true;
  });

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setName(c.name || '');
    setNotebookLmUrl(c.notebookLmUrl || '');
    setClaudeUrl(c.claudeUrl || '');
    setNotes(c.notes || '');
    setColor(c.color || '');
    setStatus(c.status || 'CLIENTE');
    setMergeTargetId('');
    setSelectedCollaboratorIds((c.collaborators || []).map(u => u.id));
    setCollaboratorSearch('');
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
          pedSheets: JSON.stringify(pedSheets),
          collaborators: selectedCollaboratorIds
        })
      });

      if (res.ok) {
        const updatedClient = await res.json();
        if (onRefresh) onRefresh();
        alert('Dati cliente salvati con successo!');
        setSelectedClient(updatedClient);
        setClients(prev => (prev || []).map(item => item.id === updatedClient.id ? updatedClient : item));
        setSelectedCollaboratorIds((updatedClient.collaborators || []).map(u => u.id));
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
      <header className={styles.header} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>👥 Rubrica e Hub Clienti</h2>

            {/* Switch tra Vista Rubrica e Vista Tabella Matrice */}
            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'cards' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'cards' ? '#000' : 'var(--text-secondary)',
                  fontWeight: viewMode === 'cards' ? 'bold' : 'normal',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📇</span> Rubrica & Schede
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'table' ? '#000' : 'var(--text-secondary)',
                  fontWeight: viewMode === 'table' ? 'bold' : 'normal',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📊</span> Tabella Matrice Clienti / Utenti
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <FaGoogle color="#4285F4" />
            <input 
              type="url" 
              placeholder="Link Pubblica sul Web (CSV)"
              value={csvUrl}
              onChange={e => setCsvUrl(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '220px', fontSize: '0.8rem' }}
            />
            <button onClick={handleSyncSheets} disabled={isSyncing} style={{ padding: '0.35rem 0.75rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
              <FaSync className={isSyncing ? 'fa-spin' : ''} />
              {isSyncing ? 'Sincronizzo...' : 'Sincronizza da Fogli'}
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'cards' && (
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.name}</span>
                    {c.collaborators && c.collaborators.length > 0 && (
                      <span 
                        style={{ 
                          fontSize: '0.65rem', 
                          background: 'rgba(34, 197, 94, 0.15)', 
                          color: 'var(--accent-primary, #22c55e)', 
                          padding: '0.05rem 0.4rem', 
                          borderRadius: '10px',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          whiteSpace: 'nowrap',
                          fontWeight: 'bold'
                        }} 
                        title={`Collaboratori: ${c.collaborators.map(u => u.name).join(', ')}`}
                      >
                        👥 {c.collaborators.length}
                      </span>
                    )}
                  </div>
                  {c.collaborators && c.collaborators.length > 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {c.collaborators.slice(0, 3).map(u => u.name?.split(' ')[0]).join(', ')}
                      {c.collaborators.length > 3 ? ` +${c.collaborators.length - 3}` : ''}
                    </div>
                  )}
                </div>
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

              {/* Sezione Collaboratori Assegnati */}
              <div style={{
                marginTop: '0.8rem',
                padding: '0.9rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>👥</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Collaboratori Assegnati</span>
                        <span style={{
                          fontSize: '0.72rem',
                          background: selectedCollaboratorIds.length > 0 ? 'var(--accent-primary, #22c55e)' : 'var(--bg-elevated)',
                          color: selectedCollaboratorIds.length > 0 ? '#000' : 'var(--text-secondary)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '10px',
                          fontWeight: 'bold'
                        }}>
                          {selectedCollaboratorIds.length}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        I collaboratori selezionati gestiscono questo cliente e ricevono i relativi avvisi.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={selectAllCollaborators}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      Tutti
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllCollaborators}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      Nessuno
                    </button>
                  </div>
                </div>

                {members.length > 6 && (
                  <input
                    type="text"
                    placeholder="🔍 Filtra collaboratori per nome..."
                    value={collaboratorSearch}
                    onChange={e => setCollaboratorSearch(e.target.value)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      maxWidth: '260px'
                    }}
                  />
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.2rem' }}>
                  {members
                    .filter(m => !collaboratorSearch || (m.name || '').toLowerCase().includes(collaboratorSearch.toLowerCase()))
                    .map(m => {
                      const isSelected = selectedCollaboratorIds.includes(m.id);
                      const initials = (m.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleCollaborator(m.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '20px',
                            border: isSelected ? '1px solid var(--accent-primary, #22c55e)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(34, 197, 94, 0.16)' : 'var(--bg-secondary)',
                            color: isSelected ? 'var(--accent-primary, #22c55e)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? '600' : 'normal',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--accent-primary, #22c55e)' : 'var(--bg-elevated)',
                              color: isSelected ? '#000' : 'var(--text-primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.62rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {initials}
                          </span>
                          <span>{m.name}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 'bold' : 'normal' }}>
                            {isSelected ? '✓' : '+'}
                          </span>
                        </button>
                      );
                    })}
                  {members.length === 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Nessun collaboratore disponibile.</span>
                  )}
                </div>
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
      )}

      {/* VISTA TABELLA MATRICE CLIENTI & UTENTI */}
      {viewMode === 'table' && (
        <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.2rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Barra Statistiche & Carico di Lavoro per Collaboratore */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>👥</span> Carico di Lavoro / Filtro Collaboratore (clicca per isolare i clienti):
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Totale: <strong>{clients.length}</strong> clienti
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setTableCollaboratorFilter(null)}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  border: tableCollaboratorFilter === null ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: tableCollaboratorFilter === null ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-secondary)',
                  color: tableCollaboratorFilter === null ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: tableCollaboratorFilter === null ? 'bold' : 'normal',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Tutti ({clients.length})
              </button>

              {members.map(m => {
                const count = clients.filter(c => (c.collaborators || []).some(u => u.id === m.id)).length;
                const isSelected = tableCollaboratorFilter === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTableCollaboratorFilter(isSelected ? null : m.id)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '16px',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{m.name}</span>
                    <span style={{
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: isSelected ? '#000' : 'var(--text-secondary)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '10px',
                      fontSize: '0.68rem',
                      fontWeight: 'bold'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setTableCollaboratorFilter(tableCollaboratorFilter === 'UNASSIGNED' ? null : 'UNASSIGNED')}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  border: tableCollaboratorFilter === 'UNASSIGNED' ? '1px solid var(--status-warning)' : '1px solid var(--border-color)',
                  background: tableCollaboratorFilter === 'UNASSIGNED' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-secondary)',
                  color: tableCollaboratorFilter === 'UNASSIGNED' ? 'var(--status-warning)' : 'var(--text-secondary)',
                  fontWeight: tableCollaboratorFilter === 'UNASSIGNED' ? 'bold' : 'normal',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Senza Team ({clients.filter(c => !c.collaborators || c.collaborators.length === 0).length})
              </button>
            </div>
          </div>

          {/* Toolbar Filtri Tabella e Switch Modalità */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="🔍 Cerca per nome cliente o collaboratore..."
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  minWidth: '260px'
                }}
              />

              <select
                value={tableStatusFilter}
                onChange={e => setTableStatusFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="ALL">Tutti gli Stati</option>
                <option value="CLIENTE">Solo Attivi</option>
                <option value="PROSPECT">Prospect</option>
                <option value="OBSOLETO">Obsoleto</option>
              </select>

              {(tableSearch || tableStatusFilter !== 'ALL' || tableCollaboratorFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setTableSearch('');
                    setTableStatusFilter('ALL');
                    setTableCollaboratorFilter(null);
                  }}
                  style={{
                    padding: '0.35rem 0.6rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--status-danger)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Azzera Filtri
                </button>
              )}
            </div>

            {/* Switch Visualizzazione: Matrice vs Elenco */}
            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-elevated)', padding: '0.2rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setTableMode('matrix')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: tableMode === 'matrix' ? 'var(--bg-secondary)' : 'transparent',
                  color: tableMode === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: tableMode === 'matrix' ? 'bold' : 'normal',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                ▦ Griglia Matrice
              </button>
              <button
                type="button"
                onClick={() => setTableMode('list')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: tableMode === 'list' ? 'var(--bg-secondary)' : 'transparent',
                  color: tableMode === 'list' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: tableMode === 'list' ? 'bold' : 'normal',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                📋 Elenco Compatto
              </button>
            </div>
          </div>

          {/* Tabella Dati */}
          <div style={{
            overflowX: 'auto',
            maxHeight: '68vh',
            overflowY: 'auto',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}>
            {tableMode === 'matrix' ? (
              /* GRIGLIA MATRICE: CLIENTE × COLLABORATORI */
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '2px solid var(--border-color)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 12,
                      background: 'var(--bg-elevated)',
                      minWidth: '220px',
                      boxShadow: '2px 0 5px rgba(0,0,0,0.2)'
                    }}>
                      Cliente ({filteredTableClients.length})
                    </th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', minWidth: '90px', textAlign: 'center' }}>
                      Stato
                    </th>
                    {members.map(m => {
                      const initials = (m.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      const memberClientCount = clients.filter(c => (c.collaborators || []).some(u => u.id === m.id)).length;
                      return (
                        <th key={m.id} style={{
                          padding: '0.6rem 0.5rem',
                          borderBottom: '2px solid var(--border-color)',
                          textAlign: 'center',
                          minWidth: '100px',
                          borderLeft: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--bg-primary)',
                              color: 'var(--accent-primary)',
                              border: '1px solid var(--border-color)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}>
                              {initials}
                            </span>
                            <span style={{ fontSize: '0.75rem', maxWidth: '85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.name}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                              ({memberClientCount})
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center', minWidth: '85px' }}>
                      Tot. Team
                    </th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center', minWidth: '80px' }}>
                      Schede
                    </th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center', minWidth: '120px' }}>
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableClients.map((client, idx) => {
                    const activeCardsCount = getClientActiveCardsCount(client.id);
                    const clientColor = client.color || 'var(--accent-primary)';
                    const isEven = idx % 2 === 0;

                    return (
                      <tr key={client.id} style={{
                        background: isEven ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                        transition: 'background 0.15s ease'
                      }}>
                        {/* Nome Cliente Sticky */}
                        <td style={{
                          padding: '0.65rem 1rem',
                          borderBottom: '1px solid var(--border-color)',
                          position: 'sticky',
                          left: 0,
                          zIndex: 5,
                          background: isEven ? 'var(--bg-secondary)' : '#192231',
                          boxShadow: '2px 0 5px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clientColor, flexShrink: 0 }} />
                            <span 
                              onClick={() => openClientDetailsFromTable(client)}
                              style={{ fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', transition: 'color 0.15s ease' }}
                              onMouseOver={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                              onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
                              title="Clicca per aprire la scheda del cliente"
                            >
                              {client.name}
                            </span>
                          </div>
                        </td>

                        {/* Stato */}
                        <td style={{ padding: '0.65rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            background: client.status === 'PROSPECT' ? 'rgba(234, 179, 8, 0.15)' : (client.status === 'OBSOLETO' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34, 197, 94, 0.15)'),
                            color: client.status === 'PROSPECT' ? 'var(--status-warning)' : (client.status === 'OBSOLETO' ? 'var(--text-secondary)' : 'var(--accent-primary)')
                          }}>
                            {client.status || 'CLIENTE'}
                          </span>
                        </td>

                        {/* Celle Collaboratori con Toggle Interattivo */}
                        {members.map(m => {
                          const isAssigned = (client.collaborators || []).some(u => u.id === m.id);
                          const isUpdating = updatingAssignmentKey === `${client.id}-${m.id}`;

                          return (
                            <td key={m.id} style={{
                              padding: '0.4rem 0.5rem',
                              borderBottom: '1px solid var(--border-color)',
                              textAlign: 'center',
                              borderLeft: '1px solid rgba(255,255,255,0.04)'
                            }}>
                              <button
                                type="button"
                                onClick={() => handleToggleAssignmentInTable(client, m.id)}
                                disabled={isUpdating}
                                title={isAssigned ? `Rimuovi ${m.name} da ${client.name}` : `Assegna ${m.name} a ${client.name}`}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: isAssigned ? '1px solid var(--accent-primary)' : '1px dashed rgba(255,255,255,0.18)',
                                  background: isAssigned ? 'rgba(34, 197, 94, 0.18)' : 'transparent',
                                  color: isAssigned ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.85rem',
                                  fontWeight: isAssigned ? 'bold' : 'normal',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={e => {
                                  if (!isAssigned) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                  }
                                }}
                                onMouseOut={e => {
                                  if (!isAssigned) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                                  }
                                }}
                              >
                                {isUpdating ? '...' : (isAssigned ? '✓' : '+')}
                              </button>
                            </td>
                          );
                        })}

                        {/* Conteggio Collaboratori */}
                        <td style={{ padding: '0.65rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '10px',
                            background: (client.collaborators || []).length > 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            color: (client.collaborators || []).length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)'
                          }}>
                            👥 {(client.collaborators || []).length}
                          </span>
                        </td>

                        {/* Conteggio Schede */}
                        <td style={{ padding: '0.65rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '10px',
                            background: activeCardsCount > 0 ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
                            color: activeCardsCount > 0 ? '#4285F4' : 'var(--text-secondary)'
                          }}>
                            {activeCardsCount > 0 ? activeCardsCount : '—'}
                          </span>
                        </td>

                        {/* Azioni */}
                        <td style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openClientDetailsFromTable(client)}
                              style={{
                                padding: '0.25rem 0.55rem',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                              title="Modifica cliente e impostazioni"
                            >
                              ✏️ Scheda
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (onOpenNotebook) onOpenNotebook(client); }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                padding: '0.1rem 0.3rem'
                              }}
                              title="Apri Brain IA"
                            >
                              🧠
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTableClients.length === 0 && (
                    <tr>
                      <td colSpan={members.length + 5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Nessun cliente trovato con i filtri attuali.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* MODALITÀ ELENCO COMPATTO */
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)' }}>Cliente</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)' }}>Stato</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)' }}>Team Assegnato</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center' }}>Schede Attive</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableClients.map((client, idx) => {
                    const activeCardsCount = getClientActiveCardsCount(client.id);
                    const clientColor = client.color || 'var(--accent-primary)';

                    return (
                      <tr key={client.id} style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                        borderBottom: '1px solid var(--border-color)'
                      }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clientColor, flexShrink: 0 }} />
                            <strong 
                              onClick={() => openClientDetailsFromTable(client)}
                              style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
                              onMouseOver={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                              onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
                            >
                              {client.name}
                            </strong>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            background: client.status === 'PROSPECT' ? 'rgba(234, 179, 8, 0.15)' : (client.status === 'OBSOLETO' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34, 197, 94, 0.15)'),
                            color: client.status === 'PROSPECT' ? 'var(--status-warning)' : (client.status === 'OBSOLETO' ? 'var(--text-secondary)' : 'var(--accent-primary)')
                          }}>
                            {client.status || 'CLIENTE'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {(client.collaborators || []).map(u => (
                              <span key={u.id} style={{
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                color: 'var(--accent-primary)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: '600'
                              }}>
                                {u.name}
                              </span>
                            ))}
                            {(!client.collaborators || client.collaborators.length === 0) && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Nessun collaboratore
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '10px',
                            background: activeCardsCount > 0 ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
                            color: activeCardsCount > 0 ? '#4285F4' : 'var(--text-secondary)'
                          }}>
                            {activeCardsCount > 0 ? `${activeCardsCount} schede` : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openClientDetailsFromTable(client)}
                              style={{
                                padding: '0.25rem 0.6rem',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Scheda
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (onOpenNotebook) onOpenNotebook(client); }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                              title="Apri Brain IA"
                            >
                              🧠
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTableClients.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Nessun cliente trovato con i filtri attuali.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
