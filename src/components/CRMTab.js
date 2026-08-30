"use client";
import React, { useState, useEffect } from 'react';
import LeadModal from './LeadModal';
import styles from '@/app/page.module.css'; // Fixed import
import confetti from 'canvas-confetti';

const PIPELINE_STAGES = [
  { id: 'LEAD', label: 'Da Contattare (Lead)', color: '#64748b' },
  { id: 'CONTATTATO', label: 'In Contatto', color: '#3b82f6' },
  { id: 'PREVENTIVO', label: 'Preventivo', color: '#f59e0b' },
  { id: 'TRATTATIVA', label: 'In Trattativa', color: '#8b5cf6' },
  { id: 'VINTO', label: 'Vinto', color: '#10b981' },
  { id: 'PERSO', label: 'Perso', color: '#ef4444' }
];

export default function CRMTab({ users = [], currentUser }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLead, setEditingLead] = useState(null);
  
  // Drag & Drop State
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Filters
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads?t=' + Date.now());
      if (res.ok) {
        setLeads(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', leadId);
    }
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverStage(null);
  };

  const handleDrop = async (e, destStageId) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (!draggedLeadId) return;

    const leadToMove = leads.find(l => l.id === draggedLeadId);
    if (!leadToMove || leadToMove.status === destStageId) {
      setDraggedLeadId(null);
      return;
    }

    const leadId = draggedLeadId;
    const newStatus = destStageId;
    
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    setDraggedLeadId(null);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        fetchLeads();
      } else {
        if (newStatus === 'VINTO') {
          triggerConfetti();
        }
      }
    } catch (err) {
      fetchLeads();
    }
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  const handleConvertToClient = async (lead) => {
    if (!window.confirm(`Creare un nuovo cliente per "${lead.companyName}"?`)) return;
    
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.companyName,
          email: lead.email || '',
          phone: lead.phone || '',
          notes: `Referente: ${lead.contactName || ''}\nFonte: ${lead.source || ''}\n\nNote commerciali: ${lead.notes || ''}`
        })
      });

      if (res.ok) {
        alert('Cliente creato con successo! Ora puoi chiudere questo lead.');
        setEditingLead(null);
      } else {
        alert('Errore durante la creazione del cliente.');
      }
    } catch (e) {
      alert('Errore di connessione.');
    }
  };

  const filteredLeads = leads.filter(l => {
    if (brandFilter !== 'ALL' && l.brand !== brandFilter) return false;
    if (userFilter !== 'ALL' && l.assignedToId !== userFilter) return false;
    return true;
  });

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Caricamento CRM...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      {/* Header & Filters */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>🤝 Pipeline Commerciale</h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gestisci l'acquisizione dei nuovi contatti.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={{ fontFamily: 'inherit', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
            <option value="ALL">Tutti i Brand</option>
            <option value="ShinyUp">ShinyUp</option>
            <option value="Daphlab">Daphlab</option>
          </select>

          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ fontFamily: 'inherit', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
            <option value="ALL">Tutti i Commerciali</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <button onClick={() => setEditingLead({})} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Nuovo Lead
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ padding: '1rem 2rem', display: 'flex', gap: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Totale Lead</span>
          <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{filteredLeads.length}</strong>
        </div>
        
        {PIPELINE_STAGES.map(stage => {
          const count = filteredLeads.filter(l => l.status === stage.id).length;
          if (count === 0) return null; // Nascondi quelli a zero per pulizia
          return (
            <div key={stage.id} style={{ padding: '0.5rem 1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', borderTop: `3px solid ${stage.color}` }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage.label}</span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{count}</strong>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem 2rem', overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = filteredLeads.filter(l => l.status === stage.id);
          const totalValue = stageLeads.reduce((acc, l) => acc + (l.value || 0), 0);

          return (
            <div 
              key={stage.id} 
              style={{ flex: 1, minWidth: '200px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}
            >
              
              {/* Stage Header */}
              <div style={{ padding: '0.8rem 1rem', borderBottom: '2px solid', borderBottomColor: stage.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: stage.color }}></span>
                  {stage.label}
                </h3>
                <span style={{ fontSize: '0.75rem', background: 'var(--bg-elevated)', padding: '0.1rem 0.4rem', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Stage Value Summary */}
              <div style={{ padding: '0.4rem 1rem', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right', background: 'rgba(0,0,0,0.02)' }}>
                Totale: <strong>€{totalValue.toLocaleString('it-IT')}</strong>
              </div>

              {/* Droppable Area */}
              <div
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                style={{
                  padding: '0.5rem',
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: '150px',
                  background: dragOverStage === stage.id ? 'rgba(0,0,0,0.05)' : 'transparent',
                  transition: 'background 0.2s ease'
                }}
              >
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setEditingLead(lead)}
                    style={{
                      userSelect: 'none',
                      padding: '0.8rem',
                      margin: '0 0 0.5rem 0',
                      background: 'var(--bg-elevated)',
                      borderRadius: '6px',
                      boxShadow: draggedLeadId === lead.id ? '0 5px 15px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                      border: '1px solid var(--border-color)',
                      borderLeft: `3px solid ${lead.brand === 'Daphlab' ? '#6d2e37' : '#a1bdcf'}`,
                      opacity: draggedLeadId === lead.id ? 0.5 : 1,
                      cursor: 'grab'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{lead.companyName}</strong>
                      {lead.value > 0 && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                          €{lead.value.toLocaleString('it-IT')}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{lead.contactName ? `👤 ${lead.contactName}` : 'Nessun referente'}</span>
                      {lead.nextActionDate && (
                        <span style={{ color: new Date(lead.nextActionDate) < new Date() ? '#ef4444' : '#3b82f6', fontWeight: 'bold' }}>
                          📅 {new Date(lead.nextActionDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: lead.brand === 'Daphlab' ? '#6d2e37' : '#a1bdcf', fontWeight: 'bold' }}>
                        {lead.brand}
                      </span>
                      
                      {lead.assignedTo && (
                        <span title={`Assegnato a ${lead.assignedTo.name}`} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>
                          {lead.assignedTo.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editingLead && (
        <LeadModal 
          lead={editingLead} 
          users={users}
          onClose={() => setEditingLead(null)}
          onUpdate={(updatedLead) => {
            setLeads(prev => {
              const exists = prev.find(l => l.id === updatedLead.id);
              if (exists) return prev.map(l => l.id === updatedLead.id ? updatedLead : l);
              return [updatedLead, ...prev];
            });
          }}
          onDelete={(id) => setLeads(prev => prev.filter(l => l.id !== id))}
          onConvertToClient={handleConvertToClient}
        />
      )}
    </div>
  );
}
