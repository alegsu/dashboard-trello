"use client";
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ArchiveView({ clients }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('cards');
  const [initialArchive, setInitialArchive] = useState({ cards: [], boards: [], lists: [], projects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/archive')
      .then(res => res.json())
      .then(data => {
        setInitialArchive(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching archive:', err);
        setLoading(false);
      });
  }, []);
  
  // Filtri
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientId, setClientId] = useState('');
  const [search, setSearch] = useState('');

  const handleRestore = async (type, id) => {
    try {
      const endpoint = `/api/${type}/${id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false })
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Errore durante il ripristino.");
      }
    } catch (e) {
      alert("Errore di rete.");
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo elemento? L'azione è irreversibile.")) return;
    try {
      const endpoint = `/api/${type}/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Errore durante l'eliminazione.");
      }
    } catch (e) {
      alert("Errore di rete.");
    }
  };

  const filteredItems = useMemo(() => {
    let list = initialArchive[activeTab] || [];
    if (clientId) {
      list = list.filter(c => c.clientId === clientId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    if (dateFrom) {
      list = list.filter(c => new Date(c.updatedAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      list = list.filter(c => new Date(c.updatedAt) <= new Date(dateTo + 'T23:59:59'));
    }
    return list;
  }, [initialArchive, activeTab, clientId, search, dateFrom, dateTo]);

  return (
    <div style={{ padding: '1rem', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      {loading && <p>Caricamento archivio in corso...</p>}
      {!loading && (
        <>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'cards', label: 'Schede' },
          { id: 'projects', label: 'Progetti' },
          { id: 'lists', label: 'Liste' },
          { id: 'boards', label: 'Bacheche' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)', 
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '1rem',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : 'none',
              paddingBottom: '0.2rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cliente</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', minWidth: '150px' }}>
            <option value="">Tutti i Clienti</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Da Data</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>A Data</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cerca Nome</label>
          <input type="text" placeholder="Cerca nome..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%' }} />
        </div>

        <button onClick={() => { setClientId(''); setDateFrom(''); setDateTo(''); setSearch(''); }} style={{ padding: '0.4rem 1rem', borderRadius: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          Reset
        </button>
      </div>

      {/* Content */}
      <div className="glass-panel" style={{ padding: '1rem', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>Nome</th>
              {(activeTab === 'cards' || activeTab === 'projects') && <th style={{ padding: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>Cliente</th>}
              <th style={{ padding: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem' }}>Archiviato Il</th>
              <th style={{ padding: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.9rem', textAlign: 'right' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nessun elemento archiviato trovato.
                </td>
              </tr>
            ) : (
              filteredItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.8rem' }}><strong>{item.name}</strong></td>
                  {(activeTab === 'cards' || activeTab === 'projects') && (
                    <td style={{ padding: '0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {item.clientId ? clients.find(c => c.id === item.clientId)?.name || 'Sconosciuto' : '-'}
                    </td>
                  )}
                  <td style={{ padding: '0.8rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {item.updatedAt || item.createdAt ? new Date(item.updatedAt || item.createdAt).toLocaleDateString('it-IT') : '-'}
                  </td>
                  <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button onClick={() => handleRestore(activeTab, item.id)} style={{ background: 'transparent', color: 'var(--status-success)', border: '1px solid var(--status-success)', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>Ripristina</button>
                      <button onClick={() => handleDelete(activeTab, item.id)} style={{ background: 'transparent', color: 'var(--status-danger)', border: '1px solid var(--status-danger)', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>Elimina</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}
