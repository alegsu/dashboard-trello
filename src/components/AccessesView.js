import React, { useState, useEffect } from 'react';
import styles from './ProjectsView.module.css';
import { FaSync, FaCopy, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function AccessesView({ clients = [], onRefresh }) {
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // ALL, CLIENT, SUPPLIER
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('SUPPLIER');
  const [showInCard, setShowInCard] = useState(true);
  const [selectedClientIds, setSelectedClientIds] = useState([]);

  const [visiblePasswords, setVisiblePasswords] = useState({});

  const fetchAccesses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accesses');
      if (res.ok) {
        setAccesses(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccesses();
  }, []);

  const handleOpenForm = (acc = null) => {
    if (acc) {
      setEditingId(acc.id);
      setName(acc.name);
      setUrl(acc.url || '');
      setUsername(acc.username || '');
      setPassword(acc.password || '');
      setNotes(acc.notes || '');
      setType(acc.type);
      setShowInCard(acc.showInCard);
      setSelectedClientIds(acc.clients?.map(c => c.id) || []);
    } else {
      setEditingId(null);
      setName('');
      setUrl('');
      setUsername('');
      setPassword('');
      setNotes('');
      setType('SUPPLIER');
      setShowInCard(true);
      setSelectedClientIds([]);
    }
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name) return;

    const payload = {
      name, url, username, password, notes, type, showInCard, clientIds: selectedClientIds
    };

    try {
      const urlPath = editingId ? `/api/accesses/${editingId}` : '/api/accesses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(urlPath, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowForm(false);
        fetchAccesses();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo accesso?')) return;
    try {
      const res = await fetch(`/api/accesses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAccesses();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const filteredAccesses = accesses.filter(a => {
    if (filterType === 'ALL') return true;
    return a.type === filterType;
  });

  return (
    <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>🔑 Accessi & Credenziali</h2>
          <button onClick={fetchAccesses} className={styles.iconBtn} title="Aggiorna"><FaSync /></button>
        </div>
        <button onClick={() => handleOpenForm()} className={styles.btnPrimary}>
          + Nuovo Accesso
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className={filterType === 'ALL' ? styles.btnPrimary : styles.btnSecondary} onClick={() => setFilterType('ALL')}>Tutti</button>
        <button className={filterType === 'CLIENT' ? styles.btnPrimary : styles.btnSecondary} onClick={() => setFilterType('CLIENT')}>Solo Clienti</button>
        <button className={filterType === 'SUPPLIER' ? styles.btnPrimary : styles.btnSecondary} onClick={() => setFilterType('SUPPLIER')}>Solo Fornitori/Tool</button>
      </div>

      {showForm ? (
        <div className={styles.card} style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Modifica Accesso' : 'Nuovo Accesso'}</h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nome (es. Aruba, Canva)</label>
              <input type="text" className={styles.input} value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Tipo</label>
              <select className={styles.input} value={type} onChange={e => setType(e.target.value)}>
                <option value="SUPPLIER">Fornitore / Tool Agenzia</option>
                <option value="CLIENT">Speciale Cliente</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>URL Login</label>
              <input type="url" className={styles.input} value={url} onChange={e => setUrl(e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Username / Email</label>
              <input type="text" className={styles.input} value={username} onChange={e => setUsername(e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Password</label>
              <input type="text" className={styles.input} value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <input type="checkbox" checked={showInCard} onChange={e => setShowInCard(e.target.checked)} id="showInCardToggle" />
              <label htmlFor="showInCardToggle" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Mostra nella Scheda Cliente (se collegato)</label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Clienti Collegati</label>
              <select 
                multiple
                className={styles.input} 
                style={{ height: '100px' }}
                value={selectedClientIds}
                onChange={e => {
                  const options = Array.from(e.target.selectedOptions);
                  setSelectedClientIds(options.map(o => o.value));
                }}
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <small style={{ color: 'var(--text-secondary)' }}>Tieni premuto CTRL (o CMD) per selezionare più clienti. I clienti collegati vedranno questo tool nella loro scheda.</small>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Note Aggiuntive</label>
              <textarea className={styles.input} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowForm(false)}>Annulla</button>
              <button type="submit" className={styles.btnPrimary}>Salva</button>
            </div>
          </form>
        </div>
      ) : null}

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredAccesses.map(acc => (
              <div key={acc.id} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {acc.type === 'SUPPLIER' ? '🛠️' : '👤'} {acc.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={() => handleOpenForm(acc)} className={styles.iconBtn} style={{ fontSize: '0.8rem' }}>✏️</button>
                    <button onClick={() => handleDelete(acc.id)} className={styles.iconBtn} style={{ fontSize: '0.8rem', color: 'var(--status-danger)' }}>🗑️</button>
                  </div>
                </div>

                {acc.url && (
                  <a href={acc.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>Apri Login ↗</a>
                )}

                <div style={{ background: 'var(--bg-glass)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>User:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{acc.username || '-'}</strong>
                      {acc.username && <button onClick={() => copyToClipboard(acc.username)} className={styles.iconBtn} style={{ padding: 0 }}><FaCopy size={12} /></button>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pass:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{visiblePasswords[acc.id] ? acc.password : '••••••••'}</strong>
                      {acc.password && (
                        <>
                          <button onClick={() => togglePasswordVisibility(acc.id)} className={styles.iconBtn} style={{ padding: 0 }}>
                            {visiblePasswords[acc.id] ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                          </button>
                          <button onClick={() => copyToClipboard(acc.password)} className={styles.iconBtn} style={{ padding: 0 }}><FaCopy size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {acc.notes && <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>{acc.notes}</p>}

                {acc.clients && acc.clients.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {acc.clients.map(c => (
                      <span key={c.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{c.name}</span>
                    ))}
                  </div>
                )}
                
                {acc.showInCard && acc.clients && acc.clients.length > 0 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--status-success)', marginTop: '0.3rem' }}>✓ Visibile nelle schede</div>
                )}
              </div>
            ))}
            {filteredAccesses.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)' }}>Nessun accesso trovato.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
