"use client";
import React, { useState } from 'react';
import styles from './SettingsPanel.module.css';

export default function SettingsPanel({ members, boards, clients = [], lists = [], onRefresh, currentUser }) {
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

  // Archive
  const [archive, setArchive] = useState({ boards: [], lists: [], cards: [], projects: [] });

  React.useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.SMTP_HOST) setSmtpHost(data.SMTP_HOST);
      if (data.SMTP_PORT) setSmtpPort(data.SMTP_PORT);
      if (data.SMTP_USER) setSmtpUser(data.SMTP_USER);
      if (data.SMTP_PASS) setSmtpPass(data.SMTP_PASS);
      if (data.BASE_URL) setBaseUrl(data.BASE_URL);
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

  const maxCards = Math.max(...liveMembers.map(m => m._count?.cards || 0), 0);
  const maxTasks = Math.max(...liveMembers.map(m => m._count?.checklistItems || 0), 0);
  const maxLists = Math.max(...liveMembers.map(m => m._count?.lists || 0), 0);

  const getClientEffortsForUser = (userName) => {
    let clientsData = [];
    clients.forEach(client => {
      if (client.sheetData) {
        try {
          const parsed = JSON.parse(client.sheetData);
          if (parsed.servicesDetails) {
            let assignedServices = [];
            let totalEffort = 0;
            let teamEffortMap = {};
            Object.entries(parsed.servicesDetails).forEach(([serviceName, collaborators]) => {
              collaborators.forEach(c => {
                 let effNum = 0;
                 if (c.effort) effNum = parseInt(c.effort.replace(/\D/g, ''), 10) || 0;
                 if (effNum === 0) effNum = Math.floor(100 / collaborators.length);
                 if (effNum > 0) teamEffortMap[c.name] = (teamEffortMap[c.name] || 0) + effNum;
              });

              const collab = collaborators.find(c => c.name.toLowerCase() === userName.toLowerCase());
              if (collab) {
                let effortNum = 0;
                if (collab.effort) {
                  effortNum = parseInt(collab.effort.replace(/\D/g, ''), 10) || 0;
                }
                if (effortNum === 0) effortNum = Math.floor(100 / collaborators.length);
                assignedServices.push({ service: serviceName, effort: effortNum });
                totalEffort += effortNum;
              }
            });
            if (assignedServices.length > 0) {
              const teamMembers = Object.keys(teamEffortMap).map(n => ({ name: n, effort: teamEffortMap[n] })).sort((a,b)=>b.effort - a.effort);
              clientsData.push({ client, totalEffort, assignedServices, teamMembers });
            }
          }
        } catch (e) {}
      }
    });
    return clientsData;
  };

  const maxClientsVal = Math.max(...liveMembers.map(m => getClientEffortsForUser(m.name).length), 0);
  const globalMax = Math.max(maxCards, maxTasks, maxLists, maxClientsVal, 1);

  return (
    <div className={styles.container}>

      <h2 className={styles.title}>⚙️ Impostazioni & Gestione</h2>
      
      {error && <div style={{background: '#fee2e2', color: '#b91c1c', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.82rem'}}>{error}</div>}

      {/* Gestione Team - Moved out of grid for full horizontal width */}
      {effectiveCurrentUser?.role === 'admin' && (
        <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
          <h3>👥 Gestione Team ({members.length})</h3>
          <p className={styles.subtitle}>Crea le credenziali per i tuoi colleghi (loro non potranno registrarsi da soli).</p>

          
          <div style={{ overflowX: 'auto', marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--bg-elevated)', textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Utente</th>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Ruolo</th>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Utilizzo</th>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Assegnazioni</th>
                    <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {liveMembers.map(m => {
                    const clientEfforts = getClientEffortsForUser(m.name);
                    const totalClientEffort = clientEfforts.reduce((acc, c) => acc + c.totalEffort, 0);
                    
                    const aggregatedServices = {};
                    clientEfforts.forEach(ce => {
                      ce.assignedServices.forEach(s => {
                        if (!aggregatedServices[s.service]) aggregatedServices[s.service] = 0;
                        aggregatedServices[s.service]++;
                      });
                    });
                    const serviceEntries = Object.entries(aggregatedServices);
                    
                    const isExpanded = expandedUserId === m.id;
                    const isEditing = editingUserId === m.id;
                    return (
                    <React.Fragment key={m.id}>
                      <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)', background: isExpanded ? 'rgba(0,0,0,0.05)' : 'transparent' }}>
                        <td style={{ padding: '0.5rem', cursor: 'pointer' }} onClick={() => setExpandedUserId(isExpanded ? null : m.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className={styles.avatar} style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{m.name.charAt(0).toUpperCase()}</div>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }} onClick={e => e.stopPropagation()}>
                                <input type="text" value={editingUserName} onChange={e => setEditingUserName(e.target.value)} className={styles.input} style={{ padding: '0.1rem 0.3rem', fontSize: '0.8rem' }} />
                                <input type="email" value={editingUserEmail} onChange={e => setEditingUserEmail(e.target.value)} className={styles.input} style={{ padding: '0.1rem 0.3rem', fontSize: '0.8rem' }} />
                                <button onClick={() => saveEditedUser(m.id)} className={styles.btnPrimary} style={{ padding: '0.1rem', fontSize: '0.7rem' }}>Salva</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isExpanded ? 'var(--accent-primary)' : 'inherit' }}>
                                  {m.name} 
                                  <span style={{ fontSize: '0.55rem', opacity: 0.7, padding: '0.1rem 0.3rem', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{isExpanded ? '▼ Espanso' : '▶ Dettagli'}</span>
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
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          <div style={{ marginBottom: '2px' }}><strong>Logins:</strong> {m.loginCount || 0}</div>
                          <div><strong>Durata:</strong> {m.totalUsageTime ? Math.floor(m.totalUsageTime / 60) : 0}h {m.totalUsageTime ? m.totalUsageTime % 60 : 0}m</div>
                        </td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', width: '30%' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                            <span style={{ whiteSpace: 'nowrap' }}><span style={{color: 'var(--accent-secondary, #a1bdcf)'}}>●</span> Task ({m._count?.cards || 0})</span>
                            <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                              <div style={{ background: 'var(--accent-secondary, #a1bdcf)', height: '100%', width: `${((m._count?.cards || 0) / globalMax) * 100}%` }}></div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                            <span style={{ whiteSpace: 'nowrap' }}><span style={{color: 'var(--status-warning)'}}>●</span> Sottotask ({m._count?.checklistItems || 0})</span>
                            <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                              <div style={{ background: 'var(--status-warning)', height: '100%', width: `${((m._count?.checklistItems || 0) / globalMax) * 100}%` }}></div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                            <span style={{ whiteSpace: 'nowrap' }}><span style={{color: 'var(--status-success)'}}>●</span> Bacheche ({m._count?.lists || 0})</span>
                            <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                              <div style={{ background: 'var(--status-success)', height: '100%', width: `${((m._count?.lists || 0) / globalMax) * 100}%` }}></div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ whiteSpace: 'nowrap' }}><span style={{color: '#8b5cf6'}}>●</span> Clienti ({clientEfforts.length})</span>
                            <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                              <div style={{ background: '#8b5cf6', height: '100%', width: `${(clientEfforts.length / globalMax) * 100}%` }}></div>
                            </div>
                          </div>
                          {serviceEntries.length > 0 && (
                            <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {serviceEntries.map(([srv, count], idx) => (
                                <span key={idx} style={{ background: 'var(--bg-elevated)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.65rem' }}>
                                  {srv}: <strong>{count}</strong>
                                </span>
                              ))}
                            </div>
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
                      {isExpanded && (
                        <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                          <td colSpan="5" style={{ padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Dettaglio Clienti e Carico Lavoro</h4>
                            {clientEfforts.length === 0 ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Nessun cliente assegnato nei Fogli Google.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {clientEfforts.map((ce, idx) => (
                                  <div key={idx} style={{ background: 'var(--bg-elevated)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <strong style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>{ce.client.name}</strong>
                                    
                                    {ce.teamMembers && ce.teamMembers.length > 1 && (
                                      <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Team assegnato (carico ripartito):</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                          {ce.teamMembers.map((tm, tmIdx) => {
                                            let color = 'var(--status-success)'; // green
                                            if (tm.effort >= 100) color = 'var(--status-danger)';
                                            else if (tm.effort >= 50) color = 'var(--status-warning)';
                                            return (
                                              <span key={tmIdx} style={{ background: tm.name.toLowerCase() === m.name.toLowerCase() ? 'var(--accent-primary)' : 'var(--bg-primary)', color: tm.name.toLowerCase() === m.name.toLowerCase() ? 'white' : 'var(--text-secondary)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--border-color)' }}>
                                                {tm.name}: <strong style={{ color: tm.name.toLowerCase() === m.name.toLowerCase() ? 'white' : color }}>{tm.effort}%</strong>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {ce.assignedServices.map((s, i) => {
                                        let color = 'var(--status-success)';
                                        if (s.effort >= 100) color = 'var(--status-danger)';
                                        else if (s.effort >= 50) color = 'var(--status-warning)';
                                        return (
                                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span>• {s.service}</span>
                                            <strong style={{ color }}>{s.effort}%</strong>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
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

            <div style={{display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '6px', marginTop: '0.5rem'}}>
              <input 
                type="text" 
                value={newUserName} 
                onChange={e => setNewUserName(e.target.value)}
                placeholder="Nome del collega..." 
                className={styles.input} 
              />
              <input 
                type="email" 
                value={newUserEmail} 
                onChange={e => setNewUserEmail(e.target.value)}
                placeholder="Email aziendale..." 
                className={styles.input} 
              />
              <input 
                type="password" 
                value={newUserPassword} 
                onChange={e => setNewUserPassword(e.target.value)}
                placeholder="Password temporanea..." 
                className={styles.input} 
              />
              <button onClick={handleAddUser} disabled={loading} className={styles.btnPrimary}>Crea Utente</button>
            </div>
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
              <li key={b.id} className={styles.listItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Membri con Accesso (Nessuno = Pubblica per tutti):</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {liveMembers.map(m => {
                          const hasAccess = b.assignees?.some(u => u.id === m.id);
                          return (
                            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', background: hasAccess ? 'rgba(59, 130, 246, 0.1)' : 'transparent', padding: '0.3rem 0.5rem', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
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
            <label>Cliente</label>
            <select className={styles.input} style={{ padding: '0.4rem 0.5rem' }} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="none">-- Nessun Cliente --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Lista di Destinazione</label>
            <select className={styles.input} style={{ padding: '0.4rem 0.5rem' }} value={selectedList} onChange={e => setSelectedList(e.target.value)}>
              <option value="">-- Seleziona Lista --</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <button 
            className={styles.btnPrimary} 
            onClick={handleGenerateTemplate} 
            disabled={generatingTemplate || !selectedTemplateTitle || !selectedList}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {generatingTemplate ? 'Generazione...' : 'Genera Scheda da Template'}
          </button>
        </div>
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


        {/* Archivio */}
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <h3>🗑️ Archivio Storico</h3>
          <p className={styles.subtitle}>Gli elementi archiviati vengono nascosti dal gestionale. Da qui puoi ripristinarli o eliminarli definitivamente.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px' }}>
              <h4>Bacheche Archiviate</h4>
              <ul className={styles.list}>
                {archive.boards.map(item => (
                  <li key={item.id} className={styles.listItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => restoreEntity('boards', item.id)} style={{ background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Ripristina</button>
                      <button onClick={() => deleteEntityPermanently('boards', item.id)} style={{ background: 'var(--status-danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Elimina</button>
                    </div>
                  </li>
                ))}
                {archive.boards.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nessuna bacheca.</span>}
              </ul>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px' }}>
              <h4>Progetti Archiviati</h4>
              <ul className={styles.list}>
                {archive.projects.map(item => (
                  <li key={item.id} className={styles.listItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => restoreEntity('projects', item.id)} style={{ background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Ripristina</button>
                      <button onClick={() => deleteEntityPermanently('projects', item.id)} style={{ background: 'var(--status-danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Elimina</button>
                    </div>
                  </li>
                ))}
                {archive.projects.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nessun progetto.</span>}
              </ul>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px' }}>
              <h4>Liste Archiviate</h4>
              <ul className={styles.list}>
                {archive.lists.map(item => (
                  <li key={item.id} className={styles.listItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => restoreEntity('lists', item.id)} style={{ background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Ripristina</button>
                      <button onClick={() => deleteEntityPermanently('lists', item.id)} style={{ background: 'var(--status-danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Elimina</button>
                    </div>
                  </li>
                ))}
                {archive.lists.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nessuna lista.</span>}
              </ul>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px' }}>
              <h4>Schede Archiviate</h4>
              <ul className={styles.list}>
                {archive.cards.map(item => (
                  <li key={item.id} className={styles.listItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => restoreEntity('cards', item.id)} style={{ background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Ripristina</button>
                      <button onClick={() => deleteEntityPermanently('cards', item.id)} style={{ background: 'var(--status-danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>Elimina</button>
                    </div>
                  </li>
                ))}
                {archive.cards.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nessuna scheda.</span>}
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
