"use client";
import React, { useState } from 'react';
import styles from './SettingsPanel.module.css';

export default function SettingsPanel({ members, boards, clients = [], lists = [], onRefresh, currentUser, setView }) {
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [openBoardDropdownId, setOpenBoardDropdownId] = useState(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  const [liveMembers, setLiveMembers] = useState(members || []);
  
  React.useEffect(() => {
    const fetchUsers = () => {
      fetch('/api/users', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setLiveMembers(data);
          }
        });
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  const effectiveCurrentUser = liveMembers.find(m => m.id === currentUser?.id) || currentUser;

  // Toggle utility per le preferenze utente
  const toggleUserPreference = async (field, currentValue) => {
    try {
      const newValue = !currentValue;
      await fetch(`/api/users/${effectiveCurrentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
      });
      // Aggiorniamo la lista liveMembers per riflettere la modifica subito
      setLiveMembers(prev => prev.map(m => m.id === effectiveCurrentUser.id ? { ...m, [field]: newValue } : m));
    } catch (err) {
      console.error(err);
      alert('Errore aggiornamento preferenza');
    }
  };

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState('');
  const [selectedClient, setSelectedClient] = useState('none');
  const [selectedList, setSelectedList] = useState(lists.length > 0 ? lists[0].id : '');
  const [generatingTemplate, setGeneratingTemplate] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  // Archive
  const [archive, setArchive] = useState({ boards: [], lists: [], cards: [], projects: [] });

  React.useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.SMTP_HOST) setSmtpHost(data.SMTP_HOST);
      if (data.SMTP_PORT) setSmtpPort(data.SMTP_PORT);
      if (data.SMTP_USER) setSmtpUser(data.SMTP_USER);
      if (data.SMTP_PASS) setSmtpPass(data.SMTP_PASS);
      if (data.BASE_URL) setBaseUrl(data.BASE_URL);
      
      if (data.ANNOUNCEMENTS) {
        try {
          setAnnouncements(JSON.parse(data.ANNOUNCEMENTS));
        } catch(e) {}
      }
    });

    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setTemplates(data);
      })
      .catch(console.error);

    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      const res = await fetch('/api/archive');
      if (res.ok) {
        setArchive(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch archive', e);
    }
  };

  const restoreEntity = async (type, id) => {
    if (!window.confirm('Vuoi ripristinare questo elemento?')) return;
    try {
      await fetch(`/api/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false })
      });
      fetchArchive();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteEntityPermanently = async (type, id) => {
    if (!window.confirm('ATTENZIONE: Eliminazione definitiva! Sei sicuro?')) return;
    try {
      await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
      fetchArchive();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSmtp = async () => {
    setLoading(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SMTP_HOST: smtpHost,
        SMTP_PORT: smtpPort,
        SMTP_USER: smtpUser,
        SMTP_PASS: smtpPass,
        BASE_URL: baseUrl
      })
    });
    setLoading(false);
    alert('Impostazioni SMTP salvate!');
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    const newId = Date.now().toString();
    const newMsg = { id: newId, text: newAnnouncement, createdAt: new Date().toISOString(), author: effectiveCurrentUser?.name || 'Admin' };
    const updated = [newMsg, ...announcements];
    
    setLoading(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ANNOUNCEMENTS: JSON.stringify(updated) })
    });
    setAnnouncements(updated);
    setNewAnnouncement('');
    setLoading(false);
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Vuoi eliminare questo annuncio?')) return;
    const updated = announcements.filter(a => a.id !== id);
    setLoading(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ANNOUNCEMENTS: JSON.stringify(updated) })
    });
    setAnnouncements(updated);
    setLoading(false);
  };

  const handleGenerateTemplate = async () => {
    if (!selectedTemplateTitle || !selectedList) {
      alert('Seleziona un template e una lista di destinazione.');
      return;
    }
    const boardId = boards[0]?.id;
    if (!boardId) return alert('Nessuna bacheca attiva.');

    const template = templates.find(t => t.title === selectedTemplateTitle);
    if (!template) return;

    setGeneratingTemplate(true);
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template,
        clientId: selectedClient,
        listId: selectedList,
        boardId
      })
    });
    setGeneratingTemplate(false);

    if (res.ok) {
      alert('Template generato con successo e inserito nel Kanban!');
      setSelectedTemplateTitle('');
      setSelectedClient('none');
      if (onRefresh) onRefresh();
    } else {
      alert('Errore durante la generazione del template.');
    }
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      return setError("Tutti i campi (Nome, Email, Password) sono obbligatori per creare un account.");
    }
    setError('');
    setLoading(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUserName, email: newUserEmail, password: newUserPassword })
    });
    
    if (res.ok) {
      window.location.reload(); 
    } else {
      const data = await res.json();
      setError(data.error);
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('ATTENZIONE: Sei sicuro di voler eliminare questo utente? Questa operazione è distruttiva.')) return;
    if (!window.confirm('Sei ASSOLUTAMENTE sicuro? Questa azione è IRREVERSIBILE.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Errore eliminazione utente');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const startEditingUser = (u) => {
    setEditingUserId(u.id);
    setEditingUserName(u.name);
    setEditingUserEmail(u.email || '');
  };

  const saveEditedUser = async (id) => {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingUserName, email: editingUserEmail })
      });
      setLiveMembers(prev => prev.map(m => m.id === id ? { ...m, name: editingUserName, email: editingUserEmail } : m));
      setEditingUserId(null);
    } catch (e) {
      console.error(e);
      alert('Errore salvataggio utente');
    }
  };

  const handleAddBoard = async () => {
    if (!newBoardName.trim()) return;
    setLoading(true);
    await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBoardName })
    });
    window.location.reload();
  };


  return (
    <div className={styles.container}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className={styles.title} style={{ margin: 0 }}>⚙️ Impostazioni & Gestione</h2>
        <button 
          onClick={() => setView && setView('archive')}
          style={{ background: 'var(--status-success)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        >
          🗄️ Apri Archivio
        </button>
      </div>
      
      {error && <div style={{background: '#fee2e2', color: '#b91c1c', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.82rem'}}>{error}</div>}

      {/* Gestione Team - Moved out of grid for full horizontal width */}
      {effectiveCurrentUser?.role === 'admin' && (
        <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>👥 Gestione Team ({members.length})</h3>
            <button 
              onClick={() => setShowAddUserForm(!showAddUserForm)}
              style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', lineHeight: '1' }}
              title="Aggiungi Utente"
            >
              +
            </button>
          </div>
          <p className={styles.subtitle}>Gestisci le credenziali per gli utenti (loro non potranno registrarsi da soli).</p>

          
          <div style={{ overflowX: 'auto', marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--bg-elevated)', textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Utente</th>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Ruolo</th>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {liveMembers.map(m => {
                    const isEditing = editingUserId === m.id;
                    return (
                    <React.Fragment key={m.id}>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'transparent' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className={styles.avatar} style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{(m.name || '?').charAt(0).toUpperCase()}</div>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }} onClick={e => e.stopPropagation()}>
                                <input type="text" value={editingUserName} onChange={e => setEditingUserName(e.target.value)} className={styles.input} style={{ padding: '0.1rem 0.3rem', fontSize: '0.8rem' }} />
                                <input type="email" value={editingUserEmail} onChange={e => setEditingUserEmail(e.target.value)} className={styles.input} style={{ padding: '0.1rem 0.3rem', fontSize: '0.8rem' }} />
                                <button onClick={() => saveEditedUser(m.id)} className={styles.btnPrimary} style={{ padding: '0.1rem', fontSize: '0.7rem' }}>Salva</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'inherit' }}>
                                  {m.name}
                                </strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.email || 'Nessuna email'}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {effectiveCurrentUser?.role === 'admin' && m.id !== effectiveCurrentUser.id ? (
                            <select 
                              value={m.role}
                              onChange={async (e) => {
                                await fetch(`/api/users/${m.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ role: e.target.value })
                                });
                                window.location.reload();
                              }}
                              style={{ fontSize: '0.75rem', padding: '0.3rem', background: 'var(--bg-glass)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            >
                              <option value="user">Utente</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              {m.role === 'admin' ? 'Admin' : 'Utente'}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                            {effectiveCurrentUser?.role === 'admin' && !isEditing && (
                              <button onClick={() => startEditingUser(m)} style={{background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem'}} title="Modifica Utente">
                                ✎
                              </button>
                            )}
                            {m.id !== effectiveCurrentUser?.id && effectiveCurrentUser?.role === 'admin' && (
                              <button onClick={() => handleDeleteUser(m.id)} style={{background: 'transparent', border: '1px solid var(--status-danger)', color: 'var(--status-danger)', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem'}} title="Elimina Utente">
                                Elimina
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                    </React.Fragment>
                    );
                  })}
                  {liveMembers.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Nessun membro. Aggiungine uno!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {showAddUserForm && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem'}}>
                <input 
                  type="text" 
                  value={newUserName} 
                  onChange={e => setNewUserName(e.target.value)} 
                  placeholder="Nome utente"
                  className={styles.input}
                  onKeyDown={e => e.key === 'Enter' && handleAddUser()}
                />
                <input 
                  type="email" 
                  value={newUserEmail} 
                  onChange={e => setNewUserEmail(e.target.value)} 
                  placeholder="Email"
                  className={styles.input}
                  onKeyDown={e => e.key === 'Enter' && handleAddUser()}
                />
                <input 
                  type="password" 
                  value={newUserPassword} 
                  onChange={e => setNewUserPassword(e.target.value)} 
                  placeholder="Password"
                  className={styles.input}
                  onKeyDown={e => e.key === 'Enter' && handleAddUser()}
                />
                <button onClick={handleAddUser} disabled={loading} className={styles.btnPrimary} style={{marginTop: '0.2rem', padding: '0.4rem'}}>
                  Crea Utente
                </button>
              </div>
            )}
          </div>
        )}

      <div className={styles.grid}>
        {/* Impostazioni Account Corrente */}
        <div className={styles.card}>
          <h3>🎨 Il Mio Account</h3>
          <p className={styles.subtitle}>Gestisci le tue preferenze visive e le notifiche email.</p>
          <div style={{ background: 'var(--bg-glass)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Tema visivo:</span>
            <select 
              value={effectiveCurrentUser?.theme || 'dark'}
              onChange={async (e) => {
                const newTheme = e.target.value;
                await fetch(`/api/users/${effectiveCurrentUser.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ theme: newTheme })
                });
                document.documentElement.setAttribute('data-theme', newTheme);
                window.location.reload();
              }}
              className={styles.input}
              style={{ width: 'auto' }}
            >
              <option value="dark">Scuro (Default)</option>
              <option value="light">Chiaro</option>
            </select>
          </div>
          
          <h3 style={{ marginTop: '1rem' }}>🔍 Zoom Kanban</h3>
          <p className={styles.subtitle}>Regola lo zoom della tua vista Kanban.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'var(--bg-glass)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Livello di Zoom</label>
            <input 
              type="range" 
              min="50" 
              max="150" 
              step="5"
              defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('kanbanZoom') || '100') : '100'}
              onChange={(e) => {
                const val = e.target.value;
                localStorage.setItem('kanbanZoom', val);
                document.getElementById('zoomLevelLabel').innerText = val + '%';
              }}
              style={{ width: '100%' }}
            />
            <div id="zoomLevelLabel" style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {typeof window !== 'undefined' ? (localStorage.getItem('kanbanZoom') || '100') : '100'}%
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0' }}>Effetto immediato al prossimo caricamento Kanban.</p>
          </div>

          <h3 style={{ marginTop: '0.8rem' }}>🔔 Notifiche Email</h3>
          <p className={styles.subtitle}>Scegli quando ricevere un avviso via email.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'var(--bg-glass)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.notifyMentions !== false} onChange={() => toggleUserPreference('notifyMentions', effectiveCurrentUser?.notifyMentions !== false)} />
              Quando vengo @menzionato in un commento
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.notifyAssignedCard !== false} onChange={() => toggleUserPreference('notifyAssignedCard', effectiveCurrentUser?.notifyAssignedCard !== false)} />
              Quando vengo assegnato a una scheda
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.notifyAssignedList !== false} onChange={() => toggleUserPreference('notifyAssignedList', effectiveCurrentUser?.notifyAssignedList !== false)} />
              Quando vengo assegnato a una lista intera
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.notifyCardDue !== false} onChange={() => toggleUserPreference('notifyCardDue', effectiveCurrentUser?.notifyCardDue !== false)} />
              Quando una scheda a me assegnata è in scadenza
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.notifyDailyRecap !== false} onChange={() => toggleUserPreference('notifyDailyRecap', effectiveCurrentUser?.notifyDailyRecap !== false)} />
              Recap quotidiano delle mie attività (Mattina)
            </label>
          </div>

          <h3 style={{ marginTop: '0.8rem' }}>✨ AI</h3>
          <p className={styles.subtitle}>Assistenti AI attivi sul tuo account.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'var(--bg-glass)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.aiChecklistEnabled !== false} onChange={() => toggleUserPreference('aiChecklistEnabled', effectiveCurrentUser?.aiChecklistEnabled !== false)} />
              <strong>Generatore Checklist:</strong> Crea sotto-task in automatico dentro le schede
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.aiReportEnabled !== false} onChange={() => toggleUserPreference('aiReportEnabled', effectiveCurrentUser?.aiReportEnabled !== false)} />
              <strong>Status Report:</strong> Genera riassunti sui progetti pronti da inviare ai clienti
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} checked={effectiveCurrentUser?.aiCategorizeEnabled !== false} onChange={() => toggleUserPreference('aiCategorizeEnabled', effectiveCurrentUser?.aiCategorizeEnabled !== false)} />
              <strong>Auto-Categorizzatore:</strong> Etichetta in automatico le nuove schede (solo con etichette esistenti)
            </label>
          </div>
        </div>

        {/* Colonna Bacheche + Template */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gestione Bacheche */}
          <div className={styles.card}>
          <h3>📋 Bacheche ({boards.length})</h3>
          <p className={styles.subtitle}>Crea nuovi spazi di lavoro indipendenti.</p>
          
          <ul className={styles.list}>
            {boards.map(b => (
              <li key={b.id} className={styles.listItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: b.color || 'var(--text-primary)' }}>■</span> 
                    <span>{b.name}</span>
                  </div>
                  <button 
                    onClick={async () => {
                      if(window.confirm('Sei sicuro di archiviare questa bacheca?')) {
                        await fetch(`/api/boards/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isArchived: true }) });
                        if (onRefresh) onRefresh();
                      }
                    }}
                    style={{ background: 'transparent', border: '1px solid var(--status-warning)', color: 'var(--status-warning)', borderRadius: '4px', padding: '0.15rem 0.4rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    Archivia
                  </button>
                </div>
                {effectiveCurrentUser?.role === 'admin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', padding: '0.5rem', background: 'var(--bg-glass)', borderRadius: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Colore Bacheca:</span>
                      <input 
                        type="color" 
                        defaultValue={b.color || '#3b82f6'} 
                        onBlur={async (e) => {
                          if (e.target.value !== b.color) {
                            await fetch(`/api/boards/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color: e.target.value }) });
                            if (onRefresh) onRefresh();
                          }
                        }} 
                        title="Cambia colore base" 
                        style={{width: '24px', height: '24px', padding: '0', border: 'none', cursor: 'pointer', background: 'transparent'}}
                      />
                    </label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem', position: 'relative' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Membri con Accesso:</span>
                      <div 
                        onClick={() => setOpenBoardDropdownId(openBoardDropdownId === b.id ? null : b.id)}
                        style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}
                      >
                        {b.assignees && b.assignees.length > 0 ? `${b.assignees.length} membri selezionati` : 'Pubblica per tutti'}
                        <span>▼</span>
                      </div>
                      
                      {openBoardDropdownId === b.id && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '0.2rem', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                          {liveMembers.map(m => {
                            const hasAccess = b.assignees?.some(u => u.id === m.id);
                            return (
                              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', background: hasAccess ? 'rgba(59, 130, 246, 0.1)' : 'transparent', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasAccess || false}
                                  onChange={async (e) => {
                                    const isChecked = e.target.checked;
                                    let newAssignees = b.assignees ? b.assignees.map(u => u.id) : [];
                                    if (isChecked) newAssignees.push(m.id);
                                    else newAssignees = newAssignees.filter(id => id !== m.id);
                                    
                                    await fetch(`/api/boards/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignees: newAssignees }) });
                                    if (onRefresh) onRefresh();
                                  }}
                                  style={{ accentColor: 'var(--accent-primary)', width: '14px', height: '14px' }}
                                />
                                {m.name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
            {boards.length === 0 && <p className={styles.empty}>Nessuna bacheca creata.</p>}
          </ul>

          <div className={styles.inputGroup}>
            <input 
              type="text" 
              value={newBoardName} 
              onChange={e => setNewBoardName(e.target.value)} 
              placeholder="Es. Progetti 2026"
              className={styles.input}
              onKeyDown={e => e.key === 'Enter' && handleAddBoard()}
            />
            <button onClick={handleAddBoard} disabled={loading} className={styles.button}>
              + Crea
            </button>
          </div>
        </div>

        {/* Generatore di Template Operativi */}
        <div className={styles.card}>
          <h3>📄 Template Operativi</h3>
          <p className={styles.subtitle}>Genera schede da template Markdown con checklist.</p>
          <div className={styles.formGroup}>
            <label>Template (Dal file .md)</label>
            <select className={styles.input} style={{ padding: '0.4rem 0.5rem' }} value={selectedTemplateTitle} onChange={e => setSelectedTemplateTitle(e.target.value)}>
              <option value="">-- Seleziona Template --</option>
              {templates.map((t, idx) => (
                <option key={idx} value={t.title}>{t.title} ({t.checklists.length} checklist)</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Cliente da taggare (Opzionale)</label>
            <select className={styles.input} style={{ padding: '0.4rem 0.5rem' }} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="none">-- Nessun cliente --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Lista di destinazione</label>
            <select className={styles.input} style={{ padding: '0.4rem 0.5rem' }} value={selectedList} onChange={e => setSelectedList(e.target.value)}>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <button onClick={handleGenerateTemplate} disabled={generatingTemplate} className={styles.button} style={{ width: '100%', marginTop: '0.5rem' }}>
            {generatingTemplate ? '⏳ Generazione...' : '🚀 Genera e Aggiungi al Kanban'}
          </button>
        </div>

        {/* Gestione Annunci */}
        {effectiveCurrentUser?.role === 'admin' && (
          <div className={styles.card}>
            <h3>📣 Bacheca Annunci Team</h3>
            <p className={styles.subtitle}>Scrivi un aggiornamento. Tutti vedranno l'avviso lampeggiante.</p>
            
            <div className={styles.inputGroup} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
              <textarea 
                value={newAnnouncement} 
                onChange={e => setNewAnnouncement(e.target.value)} 
                placeholder="Es. Da domani usiamo la nuova etichetta 'Urgente'..."
                className={styles.input}
                style={{ resize: 'vertical', minHeight: '60px', padding: '0.5rem', fontSize: '0.85rem' }}
              />
              <button onClick={handleAddAnnouncement} disabled={loading} className={styles.button} style={{ alignSelf: 'flex-end' }}>
                + Pubblica Annuncio
              </button>
            </div>

            {announcements.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Storico Annunci</h4>
                {announcements.map(a => (
                  <div key={a.id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', position: 'relative' }}>
                    <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{a.text}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <span>Di {a.author} il {new Date(a.createdAt).toLocaleDateString()}</span>
                      <button onClick={() => handleDeleteAnnouncement(a.id)} style={{ background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }} title="Elimina Annuncio">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

        {/* Impostazioni Email */}
        {effectiveCurrentUser?.role === 'admin' && (
          <div className={styles.card}>
            <h3>📧 SMTP</h3>
            <p className={styles.subtitle}>Email per le notifiche automatiche.</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.3rem'}}>
              <input 
                type="text" 
                value={smtpHost} 
                onChange={e => setSmtpHost(e.target.value)} 
                placeholder="SMTP Host (es. smtp.gmail.com)"
                className={styles.input}
              />
              <input 
                type="text" 
                value={smtpPort} 
                onChange={e => setSmtpPort(e.target.value)} 
                placeholder="Porta (es. 465 o 587)"
                className={styles.input}
              />
              <input 
                type="email" 
                value={smtpUser} 
                onChange={e => setSmtpUser(e.target.value)} 
                placeholder="Indirizzo Email"
                className={styles.input}
              />
              <input 
                type="password" 
                value={smtpPass} 
                onChange={e => setSmtpPass(e.target.value)} 
                placeholder="Password o App Password"
                className={styles.input}
              />
              
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.3rem 0' }} />
              <h4 style={{ margin: 0, fontSize: '0.8rem' }}>URL di Produzione</h4>
              <input 
                type="url" 
                value={baseUrl} 
                onChange={e => setBaseUrl(e.target.value)} 
                placeholder="es. https://miosito.com"
                className={styles.input}
              />
              
              <button onClick={handleSaveSmtp} disabled={loading} className={styles.button} style={{marginTop: '0.5rem'}}>
                Salva Impostazioni
              </button>
            </div>
          </div>
        )}




      </div>
    </div>
  );
}
