"use client";
import React, { useState } from 'react';
import styles from './SettingsPanel.module.css';

export default function SettingsPanel({ members, boards, clients = [], lists = [], onRefresh }) {
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
  }, []);

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
            {members.map(m => (
              <li key={m.id} className={styles.listItem}>
                <div className={styles.avatar}>{m.name.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>{m.name}</strong>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{m.email || 'Nessuna email'} • {m.role === 'admin' ? 'Amministratore' : 'Utente'}</div>
                </div>
              </li>
            ))}
            {members.length === 0 && <p className={styles.empty}>Nessun membro. Aggiungine uno!</p>}
          </ul>

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px'}}>
            <input 
              type="text" 
              value={newUserName} 
              onChange={e => setNewUserName(e.target.value)} 
              placeholder="Nome Completo (Es. Giulia Verdi)"
              className={styles.input}
            />
            <input 
              type="email" 
              value={newUserEmail} 
              onChange={e => setNewUserEmail(e.target.value)} 
              placeholder="Email Aziendale"
              className={styles.input}
            />
            <input 
              type="password" 
              value={newUserPassword} 
              onChange={e => setNewUserPassword(e.target.value)} 
              placeholder="Password Iniziale"
              className={styles.input}
            />
            <button onClick={handleAddUser} disabled={loading} className={styles.button} style={{marginTop: '0.5rem'}}>
              + Crea Account
            </button>
          </div>
        </div>

        {/* Gestione Bacheche */}
        <div className={styles.card}>
          <h3>📋 Bacheche ({boards.length})</h3>
          <p className={styles.subtitle}>Crea nuovi spazi di lavoro indipendenti.</p>
          
          <ul className={styles.list}>
            {boards.map(b => (
              <li key={b.id} className={styles.listItem}>
                <span style={{marginRight: '8px'}}>📁</span> {b.name}
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
            <select className={styles.input} value={selectedTemplateTitle} onChange={e => setSelectedTemplateTitle(e.target.value)}>
              <option value="">-- Seleziona Template --</option>
              {templates.map((t, idx) => (
                <option key={idx} value={t.title}>{t.title} ({t.checklists.length} checklist)</option>
              ))}
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label>Cliente</label>
            <select className={styles.input} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="none">-- Nessun Cliente --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Lista di Destinazione</label>
            <select className={styles.input} value={selectedList} onChange={e => setSelectedList(e.target.value)}>
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
    </div>
  );
}
