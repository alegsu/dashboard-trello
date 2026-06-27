"use client";
import React, { useState, useEffect } from 'react';
import { X, Save, Folder, Clock, DollarSign, Tag, Calendar, AlertCircle, Copy as CopyIcon, Sparkles, CheckCircle, Users, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import styles from './CardModal.module.css'; // Possiamo riusare alcuni stili del CardModal

export default function ProjectModal({ project, clients, members, currentUser, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    name: project.name || '',
    clientId: project.clientId || 'none',
    newClientName: '',
    description: project.description || '',
    status: project.status || 'In Coda',
    category: project.category || '',
    priority: project.priority || 'Normale',
    dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
    estimatedHours: project.estimatedHours || '',
    actualHours: project.actualHours || '',
    sellingPrice: project.sellingPrice || '',
    budget: project.budget || '',
    effort: project.effort || '',
    driveFolderId: project.driveFolderId || ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Stats Data
  const allCards = project.cards || [];
  const completedCards = allCards.filter(c => c.list?.name?.toLowerCase().includes('fatt') || c.list?.name?.toLowerCase().includes('completat') || c.isArchived || c.list?.type === 'done');
  const activeCards = allCards.filter(c => !completedCards.includes(c));
  
  const progressPercent = allCards.length > 0 ? Math.round((completedCards.length / allCards.length) * 100) : 0;
  
  const allTasks = [];
  allCards.forEach(c => {
    if (c.checklists) {
      c.checklists.forEach(cl => {
        if (cl.items) allTasks.push(...cl.items);
      });
    }
  });
  const completedTasks = allTasks.filter(t => t.isCompleted);

  // Extract Assignees
  const assigneeMap = {};
  allCards.forEach(c => {
    (c.assignees || []).forEach(a => {
      if (!assigneeMap[a.id]) assigneeMap[a.id] = a;
    });
  });
  const projectAssignees = Object.values(assigneeMap);

  // Timeline Charts Data (Burn-up)
  const startD = new Date(project.createdAt || Date.now());
  startD.setHours(0,0,0,0);
  const todayD = new Date();
  todayD.setHours(0,0,0,0);
  const endD = project.dueDate ? new Date(project.dueDate) : new Date(startD.getTime() + 30 * 24 * 60 * 60 * 1000);
  endD.setHours(0,0,0,0);
  
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
  const endStr = endD.toLocaleDateString('en-CA');
  
  const timelineDays = [];
  let currentD = new Date(startD);
  const lastD = endD > todayD ? endD : todayD;
  while (currentD <= lastD) {
    timelineDays.push(new Date(currentD).toLocaleDateString('en-CA'));
    currentD.setDate(currentD.getDate() + 1);
  }

  const totalDaysToDue = Math.max(1, Math.ceil((endD - startD) / (1000 * 60 * 60 * 24)));
  const totalDaysToToday = Math.max(1, Math.ceil((todayD - startD) / (1000 * 60 * 60 * 24)));

  const cardsTimelineData = timelineDays.map(dayStr => {
    const d = new Date(dayStr);
    const daysFromStart = Math.ceil((d - startD) / (1000 * 60 * 60 * 24));
    
    let ideal = Math.round((daysFromStart / totalDaysToDue) * allCards.length);
    if (daysFromStart < 0) ideal = 0;
    if (dayStr > endStr) ideal = allCards.length;

    let actual = null;
    if (dayStr <= todayStr) {
      actual = Math.round((daysFromStart / totalDaysToToday) * completedCards.length);
      if (daysFromStart < 0) actual = 0;
    }

    return { 
      name: dayStr.substring(5).replace('-', '/'),
      Totale: allCards.length, 
      Ideale: ideal,
      Completati: actual 
    };
  });

  const tasksTimelineData = timelineDays.map(dayStr => {
    const d = new Date(dayStr);
    const daysFromStart = Math.ceil((d - startD) / (1000 * 60 * 60 * 24));
    
    let ideal = Math.round((daysFromStart / totalDaysToDue) * allTasks.length);
    if (daysFromStart < 0) ideal = 0;
    if (dayStr > endStr) ideal = allTasks.length;

    let actual = null;
    if (dayStr <= todayStr) {
      actual = Math.round((daysFromStart / totalDaysToToday) * completedTasks.length);
      if (daysFromStart < 0) actual = 0;
    }

    return { 
      name: dayStr.substring(5).replace('-', '/'),
      Totale: allTasks.length, 
      Ideale: ideal,
      Completati: actual 
    };
  });

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionTarget, setMentionTarget] = useState(null);
  
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const generateSummary = async () => {
    setLoadingSummary(true);
    setAiSummary('Generazione riassunto in corso...');
    try {
      const res = await fetch('/api/ai/summary-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      });
      const data = await res.json();
      if (data.summary) {
        setAiSummary(data.summary);
      } else {
        setAiSummary('Errore nella generazione del riassunto.');
      }
    } catch (e) {
      setAiSummary('Errore di rete durante la generazione.');
    }
    setLoadingSummary(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Eliminare definitivamente questo progetto? L'operazione è irreversibile.")) return;
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleArchive = async () => {
    if (!window.confirm("Archiviare questo progetto? Scomparirà dalla vista principale.")) return;
    await fetch(`/api/projects/${project.id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: true })
    });
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleClone = async () => {
    if (!window.confirm("Vuoi clonare questo progetto?")) return;
    setSaving(true);
    
    const clonedData = {
      ...formData,
      name: formData.name + " (Copia)",
      status: "In Coda"
    };

    await fetch(`/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clonedData)
    });
    
    setSaving(false);
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleMentionChange = (val, target, setter) => {
    setter(val);
    const textarea = document.getElementById(`textarea-${target}`);
    if (textarea) {
      const cursor = textarea.selectionStart;
      const textBefore = val.slice(0, cursor);
      const match = /(?:^|\s)@([a-zA-Z0-9_.]*)$/.exec(textBefore);
      if (match) {
        setMentionQuery(match[1].toLowerCase());
        setMentionTarget(target);
      } else {
        if (mentionTarget === target) {
          setMentionQuery(null);
          setMentionTarget(null);
        }
      }
    }
  };

  const renderMentionDropdown = (target, currentText, setter) => {
    if (mentionTarget !== target || mentionQuery === null) return null;
    return (
      <div style={{ position: 'absolute', top: '100%', left: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', zIndex: 100, maxHeight: '150px', overflowY: 'auto', width: '250px', boxShadow: 'var(--shadow-md)' }}>
        {(members || []).filter(m => m?.name && m.name.toLowerCase().replace(/\s+/g, '').includes(mentionQuery)).map(m => (
          <div 
            key={m.id} 
            onClick={() => {
              const textarea = document.getElementById(`textarea-${target}`);
              const cursor = textarea.selectionStart;
              const textBefore = currentText.slice(0, cursor);
              const textAfter = currentText.slice(cursor);
              const match = /(?:^|\s)@([a-zA-Z0-9_.]*)$/.exec(textBefore);
              if (match) {
                const startIdx = textBefore.lastIndexOf('@' + match[1]);
                const mentionText = `@${m.name.replace(/\s+/g, '')} `;
                setter(textBefore.slice(0, startIdx) + mentionText + textAfter);
                setMentionQuery(null);
                setMentionTarget(null);
                textarea.focus();
              }
            }}
            style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontSize: '0.7rem', fontWeight: 'bold' }}>
              {m.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem' }}>{m.name}</span>
          </div>
        ))}
        {(members || []).filter(m => m?.name && m.name.toLowerCase().replace(/\s+/g, '').includes(mentionQuery)).length === 0 && (
          <div style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nessun utente trovato</div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchComments();
    fetchCategories();
  }, [project.id]);

  const fetchCategories = async () => {
    const res = await fetch('/api/labels');
    if (res.ok) {
      const data = await res.json();
      setCategories(data);
    }
  };

  const fetchComments = async () => {
    const res = await fetch(`/api/projects/${project.id}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setSaving(false);
    if (onRefresh) onRefresh();
    onClose();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const authorId = localStorage.getItem('userId');

    await fetch(`/api/projects/${project.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newComment, authorId, baseUrl: window.location.origin })
    });
    setNewComment('');
    fetchComments();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: '80vw', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
        
        {/* Full Width Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-elevated)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <input 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '60%', outline: 'none' }}
            placeholder="Nome Progetto"
          />
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button onClick={handleSave} disabled={saving} title="Salva Modifiche" style={{ background: 'transparent', color: 'var(--status-success)', border: '1px solid var(--status-success)', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Save size={14} />
            </button>
            <button onClick={generateSummary} disabled={loadingSummary} title="Genera Riassunto AI" style={{ background: 'transparent', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Sparkles size={14} />
            </button>
            <button onClick={handleClone} title="Clona Progetto" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <CopyIcon size={14} />
            </button>
            <button onClick={handleArchive} title="Archivia" style={{ background: 'transparent', color: 'var(--status-warning)', border: '1px solid var(--status-warning)', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Folder size={14} />
            </button>
            <button onClick={handleDelete} title="Elimina" style={{ background: 'transparent', color: 'var(--status-danger)', border: '1px solid var(--status-danger)', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} />
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
            <button onClick={onClose} title="Chiudi" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>
          
          {/* Main Content Area (Left) */}
          <div style={{ flex: 2, padding: '2rem', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>


          <div>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={16}/> Descrizione Pubblica</h4>
            <div style={{ position: 'relative' }}>
              <textarea 
                id="textarea-description"
                value={formData.description} 
                onChange={e => handleMentionChange(e.target.value, 'description', val => setFormData({ ...formData, description: val }))}
                className={styles.textarea}
                placeholder="Descrizione visibile a tutti... usa @ per menzionare"
                rows={3}
              />
              {renderMentionDropdown('description', formData.description, val => setFormData({ ...formData, description: val }))}
            </div>
          </div>

          {/* Main Content Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
                  <Activity size={16}/> Statistiche Progetto
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Avanzamento</span>
                  <span style={{ fontWeight: 'bold' }}>{progressPercent}%</span>
                </div>
                <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--status-success)', transition: 'width 0.3s ease' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Schede Totali</span>
                  <span style={{ fontWeight: 'bold' }}>{allCards.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Schede da Completare</span>
                  <span style={{ fontWeight: 'bold' }}>{activeCards.length}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Task (Sottotask) Totali</span>
                  <span style={{ fontWeight: 'bold' }}>{allTasks.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Task da Completare</span>
                  <span style={{ fontWeight: 'bold' }}>{allTasks.length - completedTasks.length}</span>
                </div>
                
                {projectAssignees.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                      <Users size={14}/> Team Coinvolto
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {projectAssignees.map(a => (
                        <div key={a.id} title={a.name} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {a.name.substring(0, 2).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', height: '100%' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
                  <Calendar size={16}/> Roadmap Temporale
                </h4>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Avanzamento Schede</div>
                  <div style={{ height: '180px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cardsTimelineData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="Totale" stroke="rgba(255,255,255,0.1)" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="Ideale" stroke="var(--status-warning)" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="Completati" stroke="var(--status-success)" strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Avanzamento Task (Sottotask)</div>
                  <div style={{ height: '180px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tasksTimelineData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line type="monotone" dataKey="Totale" stroke="rgba(255,255,255,0.1)" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="Ideale" stroke="var(--status-warning)" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="Completati" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}><CheckCircle size={16}/> Lista Schede Attive</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {activeCards.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                  Nessuna scheda attiva. Ottimo lavoro!
                </div>
              ) : (
                activeCards.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => { window.location.href = `/?card=${c.id}`; }}
                    title="Clicca per aprire la scheda"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(161, 189, 207, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{c.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>in {c.list?.name || 'Sconosciuta'}</span>
                    </div>
                    {c.due && (
                      <div style={{ fontSize: '0.8rem', color: new Date(c.due) < new Date() ? 'var(--status-danger)' : 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {new Date(c.due).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div style={{ marginTop: '1rem' }}>
            <h4>Commenti del Progetto</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea 
                  id="textarea-comment"
                  value={newComment} 
                  onChange={e => handleMentionChange(e.target.value, 'comment', setNewComment)} 
                  className={styles.textarea} 
                  placeholder="Scrivi un commento e usa @ per menzionare..." 
                  rows={2}
                />
                {renderMentionDropdown('comment', newComment, setNewComment)}
              </div>
              <button onClick={handleAddComment} className={styles.saveBtn} style={{ height: 'auto' }}>Invia</button>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {comments.map(c => (
                <div key={c.id} style={{ background: 'var(--bg-glass)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>
                    {c.author?.name || 'Sconosciuto'} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>- {new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>{c.text}</div>
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Sidebar Area (Right) */}
          <div style={{ width: '320px', minWidth: '320px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {aiSummary && (
              <div style={{ background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--accent-primary)', boxShadow: '0 0 10px rgba(161, 189, 207, 0.1)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.85rem' }}><Sparkles size={14}/> AI Insight</h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {aiSummary.split('\n').map((line, i) => <p key={i} style={{ margin: '0 0 0.3rem 0' }}>{line}</p>)}
                </div>
              </div>
            )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stato</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <option>Preventivo</option>
                <option>In Coda</option>
                <option>In Corso</option>
                <option>In Revisione</option>
                <option>Completato</option>
                <option>In Pausa</option>
                <option>Annullato</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cliente</label>
              <select value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <option value="none">-- Nessun Cliente --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Categoria</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <option value="">-- Nessuna Categoria --</option>
                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priorità</label>
              <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <option>Bassa</option>
                <option>Normale</option>
                <option>Alta</option>
                <option>Urgente</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><Calendar size={12}/> Scadenza</label>
              <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}/>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)} 
                className={styles.btnSecondary}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', background: 'transparent', border: '1px dashed var(--border-color)', width: '100%' }}
              >
                {showAdvanced ? 'Nascondi campi avanzati' : 'Aggiungi dettagli (Costi, Ore...)'}
              </button>
            </div>

            {showAdvanced && (
              <>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><DollarSign size={12}/> Prezzo Vendita (€)</label>
                  <input type="number" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><DollarSign size={12}/> Budget Costi (€)</label>
                  <input type="number" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}/>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><Clock size={12}/> Ore Stimate</label>
                  <input type="number" value={formData.estimatedHours} onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><Clock size={12}/> Ore Effettive</label>
                  <input type="number" value={formData.actualHours} onChange={e => setFormData({ ...formData, actualHours: e.target.value })} placeholder="0" style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={12}/> Effort 
                    <span title="Livello di Effort o Complessità da 1 a 10. Indica lo sforzo richiesto per completare il progetto (1=Basso, 10=Altissimo)." style={{ cursor: 'help', background: 'var(--bg-secondary)', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>?</span>
                  </label>
                  <select value={formData.effort} onChange={e => setFormData({ ...formData, effort: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                    <option value="">-- Seleziona --</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}/>
            
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cartella Google Drive (ID)</label>
              <input value={formData.driveFolderId} onChange={e => setFormData({ ...formData, driveFolderId: e.target.value })} placeholder="Es. 1A2b3C..." style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              {formData.driveFolderId && (
                <a href={`https://drive.google.com/drive/folders/${formData.driveFolderId}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'block', marginTop: '0.2rem' }}>
                  Apri cartella Drive ↗
                </a>
              )}
            </div>

          </div>


        </div>
      </div>
    </div>
  );
}
