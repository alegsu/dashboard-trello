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
  
  const [liveMembers, setLiveMembers] = useState(members || []);
  
  React.useEffect(() => {
    fetch('/api/users', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLiveMembers(data);
        }
      });
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
        SMTP_PASS: smtpPass
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

      <h2 className={styles.title}>⚙️ Impostazioni & Gestione</h2>
      
      {error && <div style={{background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>{error}</div>}

      <div className={styles.grid}>
        {/* Gestione Team */}
        <div className={styles.card}>
          <h3>👥 Crea Account Team ({members.length})</h3>
          <p className={styles.subtitle}>Crea le credenziali per i tuoi colleghi (loro non potranno registrarsi da soli).</p>
          
          <ul className={styles.list}>
            {liveMembers.map(m => (
              <li key={m.id} className={styles.listItem} style={{ alignItems: 'flex-start', flexWrap: 'wrap', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 200px' }}>
                  <div className={styles.avatar}>{m.name.charAt(0).toUpperCase()}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <strong>{m.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.email || 'Nessuna email'}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <div>
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
                        style={{ fontSize: '0.8rem', padding: '0.3rem', background: 'var(--bg-glass)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                      >
                        <option value="user">Utente</option>
                        <option value="admin">Amministratore</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {m.role === 'admin' ? 'Amministratore' : 'Utente'}
                      </span>
                    )}
                  </div>

                  {effectiveCurrentUser?.role === 'admin' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '0.4rem 0.8rem', borderRadius: '4px', textAlign: 'right' }}>
                      <div style={{ marginBottom: '2px' }}><strong>Logins:</strong> {m.loginCount || 0}</div>
                      <div><strong>Tempo:</strong> {m.totalUsageTime ? Math.round(m.totalUsageTime / 60) : 0}h {m.totalUsageTime ? m.totalUsageTime % 60 : 0}m</div>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {liveMembers.length === 0 && <p className={styles.empty}>Nessun membro. Aggiungine uno!</p>}
          </ul>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', marginTop: '2rem'}}>
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

        {/* Preferenze Visive (Slegato) */}
        <div className={styles.card}>
          <h3>🎨 Preferenze Visive</h3>
          <p className={styles.subtitle}>Cambia l'aspetto grafico solo per il tuo account.</p>
          <div style={{ background: 'var(--bg-glass)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <span>Tema:</span>
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

          <h3 style={{ marginTop: '2rem' }}>🔔 Notifiche Email</h3>
          <p className={styles.subtitle}>Scegli quando desideri ricevere un avviso via email.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-glass)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={effectiveCurrentUser?.notifyMentions !== false} onChange={() => toggleUserPreference('notifyMentions', effectiveCurrentUser?.notifyMentions !== false)} />
              Quando vengo menzionato in un commento
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={effectiveCurrentUser?.notifyAssignedCard !== false} onChange={() => toggleUserPreference('notifyAssignedCard', effectiveCurrentUser?.notifyAssignedCard !== false)} />
              Quando vengo assegnato a una scheda
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={effectiveCurrentUser?.notifyAssignedList !== false} onChange={() => toggleUserPreference('notifyAssignedList', effectiveCurrentUser?.notifyAssignedList !== false)} />
              Quando vengo assegnato a una lista intera
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={effectiveCurrentUser?.notifyCardDue !== false} onChange={() => toggleUserPreference('notifyCardDue', effectiveCurrentUser?.notifyCardDue !== false)} />
              Quando una scheda a me assegnata è in scadenza
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={effectiveCurrentUser?.notifyDailyRecap !== false} onChange={() => toggleUserPreference('notifyDailyRecap', effectiveCurrentUser?.notifyDailyRecap !== false)} />
              Recap quotidiano delle mie attività (Mattina)
            </label>
          </div>
        </div>

        {/* Gestione Bacheche */}
        <div className={styles.card}>
          <h3>📋 Bacheche ({boards.length})</h3>
          <p className={styles.subtitle}>Crea nuovi spazi di lavoro indipendenti.</p>
          
          <ul className={styles.list}>
            {boards.map(b => (
              <li key={b.id} className={styles.listItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><span style={{marginRight: '8px'}}>📁</span> {b.name}</div>
                <button 
                  onClick={async () => {
                    if(window.confirm('Sei sicuro di archiviare questa bacheca?')) {
                      await fetch(`/api/boards/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isArchived: true }) });
                      if (onRefresh) onRefresh();
                    }
                  }}
                  style={{ background: 'transparent', border: '1px solid var(--status-warning)', color: 'var(--status-warning)', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Archivia
                </button>
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

        {/* Preferenze Utente (Notifiche) */}
        <div className={styles.card}>
          <h3>🔔 Le Mie Notifiche</h3>
          <p className={styles.subtitle}>Scegli quali avvisi via email vuoi ricevere per l'account <strong>{effectiveCurrentUser?.email}</strong>.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input 
                type="checkbox" 
                checked={effectiveCurrentUser?.notifyMentions ?? true} 
                onChange={() => toggleUserPreference('notifyMentions', effectiveCurrentUser?.notifyMentions ?? true)} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              Quando qualcuno mi @menziona
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input 
                type="checkbox" 
                checked={effectiveCurrentUser?.notifyAssignedCard ?? true} 
                onChange={() => toggleUserPreference('notifyAssignedCard', effectiveCurrentUser?.notifyAssignedCard ?? true)} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              Quando mi assegnano una Scheda
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input 
                type="checkbox" 
                checked={effectiveCurrentUser?.notifyAssignedList ?? true} 
                onChange={() => toggleUserPreference('notifyAssignedList', effectiveCurrentUser?.notifyAssignedList ?? true)} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              Quando mi assegnano un'intera Lista
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input 
                type="checkbox" 
                checked={effectiveCurrentUser?.notifyCardDue ?? true} 
                onChange={() => toggleUserPreference('notifyCardDue', effectiveCurrentUser?.notifyCardDue ?? true)} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
              />
              Promemoria schede in scadenza a breve
            </label>
          </div>
        </div>

        {/* Impostazioni Email */}
        <div className={styles.card}>
          <h3>📧 Server di Posta (SMTP)</h3>
          <p className={styles.subtitle}>Configura l'email da cui il gestionale invierà le notifiche (es. quando assegni un task).</p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem'}}>
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
            <button onClick={handleSaveSmtp} disabled={loading} className={styles.button} style={{marginTop: '0.5rem'}}>
              Salva Impostazioni SMTP
            </button>
          </div>

        </div>

        {/* Generatore di Template Operativi */}
        <div className={styles.card}>
          <h3>Generatore di Template Operativi</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Seleziona un template dal file Markdown e assegnalo a un cliente e a una lista per generare automaticamente la scheda con tutte le checklist.
          </p>
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

        {/* Archivio */}
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <h3>🗑️ Archivio Storico</h3>
          <p className={styles.subtitle}>Gli elementi archiviati vengono nascosti dal gestionale. Da qui puoi ripristinarli o eliminarli definitivamente.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
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

            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
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

            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
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

            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
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
