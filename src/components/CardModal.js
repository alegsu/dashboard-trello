"use client";
import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CheckSquare, Clock, Tag, MessageSquare, Paperclip, ExternalLink, Copy, Archive, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from './CardModal.module.css';

export default function CardModal({ cardId, members, onClose, onRefresh }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [description, setDescription] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState({});
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  // AI Summary
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiError, setAiError] = useState('');
  const [boardLabels, setBoardLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#ff5722');
  
  const [allProjects, setAllProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [allClients, setAllClients] = useState([]);
  const [newClientName, setNewClientName] = useState('');

  const fetchCard = async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}`);
      if (res.ok) {
        const data = await res.json();
        setCard(data);
        setDescription(data.description || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}/attachments`);
      if (res.ok) {
        setAttachments(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCard();
    fetchAttachments();
  }, [cardId]);

  useEffect(() => {
    if (card && card.boardId) {
      fetch(`/api/labels?boardId=${card.boardId}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) setBoardLabels(data);
        });
    }
  }, [card?.boardId]);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setAllProjects(data);
      });
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setAllClients(data);
      });
  }, []);

  const updateCard = async (updates) => {
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    fetchCard();
    onRefresh();
  };

  const copyCard = async () => {
    if (!confirm('Vuoi duplicare questa scheda e le sue checklist?')) return;
    const res = await fetch(`/api/cards/${cardId}/copy`, { method: 'POST' });
    if (res.ok) {
      onRefresh();
      onClose();
    }
  };

  const archiveCard = async () => {
    if (window.confirm("Sei sicuro di voler archiviare questa scheda? Potrai ripristinarla dalle impostazioni.")) {
      await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      });
      onRefresh();
      onClose();
    }
  };

  const deleteCard = async () => {
    if (window.confirm("Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questa scheda? L'azione è irreversibile.")) {
      await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      onRefresh();
      onClose();
    }
  };

  const handleSaveDescription = () => {
    if (description !== card.description) {
      updateCard({ description });
    }
  };

  const toggleAssignee = (memberId) => {
    const currentAssignees = card.assignees.map(a => a.id);
    const newAssignees = currentAssignees.includes(memberId) 
      ? currentAssignees.filter(id => id !== memberId)
      : [...currentAssignees, memberId];
    updateCard({ assignees: newAssignees });
  };

  const toggleLabel = (labelId) => {
    const currentLabels = card.labels.map(l => l.id);
    const newLabels = currentLabels.includes(labelId)
      ? currentLabels.filter(id => id !== labelId)
      : [...currentLabels, labelId];
    updateCard({ labels: newLabels });
  };

  const createLabel = async () => {
    if (!newLabelName.trim()) return;
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLabelName, color: newLabelColor, boardId: card.boardId })
    });
    if (res.ok) {
      const newLabel = await res.json();
      setBoardLabels([...boardLabels, newLabel]);
      updateCard({ labels: [...card.labels.map(l=>l.id), newLabel.id] });
      setNewLabelName('');
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    const payload = { name: newProjectName };
    if (card.clientId) payload.clientId = card.clientId;
    
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const newProj = await res.json();
      setAllProjects([...allProjects, newProj]);
      updateCard({ projectId: newProj.id });
      setNewProjectName('');
    }
  };

  const createClient = async () => {
    if (!newClientName.trim()) return;
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName })
    });
    if (res.ok) {
      const newClient = await res.json();
      setAllClients([...allClients, newClient]);
      updateCard({ clientId: newClient.id });
      setNewClientName('');
    }
  };

  const addChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newChecklistTitle, cardId })
    });
    setNewChecklistTitle('');
    fetchCard();
  };

  const addChecklistItem = async (checklistId) => {
    const text = newItemTexts[checklistId];
    if (!text || !text.trim()) return;
    await fetch('/api/checklist-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, checklistId })
    });
    setNewItemTexts({ ...newItemTexts, [checklistId]: '' });
    fetchCard();
  };

  const toggleChecklistItem = async (itemId, isCompleted) => {
    await fetch(`/api/checklist-items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !isCompleted })
    });
    
    if (!isCompleted) {
      // It was unchecked, now we are checking it!
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
    
    fetchCard();
  };

  const toggleChecklistItemAssignee = async (item, memberId) => {
    const currentAssignees = item.assignees ? item.assignees.map(a => a.id) : [];
    const newAssignees = currentAssignees.includes(memberId)
      ? currentAssignees.filter(id => id !== memberId)
      : [...currentAssignees, memberId];
      
    await fetch(`/api/checklist-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignees: newAssignees })
    });
    fetchCard();
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    const authorId = localStorage.getItem('userId');
    const mentions = newComment.match(/@(\w+)/g);
    
    await fetch(`/api/cards/${cardId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newComment, authorId, mentions })
    });
    setNewComment('');
    fetchCard();
  };

  const addAttachment = async () => {
    if (!newAttachmentUrl.trim()) return;
    await fetch(`/api/cards/${cardId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newAttachmentUrl, name: newAttachmentName || newAttachmentUrl })
    });
    setNewAttachmentUrl('');
    setNewAttachmentName('');
    fetchAttachments();
  };

  const generateAiSummary = async () => {
    setLoadingSummary(true);
    setAiError('');
    setAiSummary('');
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId })
      });
      const data = await res.json();
      if (res.ok) {
        setAiSummary(data.summary);
      } else {
        setAiError(data.error);
      }
    } catch (err) {
      setAiError('Errore di connessione al server AI.');
    }
    setLoadingSummary(false);
  };

  if (loading) return <div className={styles.overlay}><div className={styles.modal} style={{padding: '2rem', textAlign: 'center'}}>Caricamento...</div></div>;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>{card.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button title="Copia Scheda" onClick={copyCard} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <Copy size={16} />
            </button>
            <button title="Archivia Scheda" onClick={archiveCard} style={{ background: 'transparent', border: '1px solid var(--status-warning)', color: 'var(--status-warning)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <Archive size={16} />
            </button>
            <button title="Elimina Scheda" onClick={deleteCard} style={{ background: 'transparent', border: '1px solid var(--status-danger)', color: 'var(--status-danger)', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={16} />
            </button>
            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.mainCol}>
            
            <div className={styles.section} style={{ background: 'linear-gradient(to right, rgba(var(--accent-rgb), 0.05), transparent)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✨ Intelligenza Artificiale</h3>
                <button 
                  onClick={generateAiSummary} 
                  disabled={loadingSummary}
                  style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {loadingSummary ? 'Generazione...' : 'Riassumi Scheda'}
                </button>
              </div>
              {aiError && <div style={{ color: 'var(--status-danger)', fontSize: '0.85rem' }}>{aiError}</div>}
              {aiSummary && (
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                  {aiSummary}
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h3>Descrizione</h3>
              <textarea 
                className={styles.textarea} 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                onBlur={handleSaveDescription}
                placeholder="Aggiungi una descrizione dettagliata..."
                rows={4}
              />
            </div>

            {card.checklists.map(checklist => {
              const completed = checklist.items.filter(i => i.isCompleted).length;
              const total = checklist.items.length;
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
              
              return (
                <div key={checklist.id} className={styles.section}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={16}/> {checklist.title}</h3>
                  <div className={styles.progressBarBg}>
                    <div className={styles.progressBarFill} style={{ width: `${percent}%`, background: percent === 100 ? 'var(--status-success)' : 'var(--accent-primary)' }}></div>
                  </div>
                  <ul className={styles.checklistItems}>
                    {checklist.items.map(item => (
                      <li key={item.id} className={styles.checklistItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <input type="checkbox" checked={item.isCompleted} onChange={() => toggleChecklistItem(item.id, item.isCompleted)} />
                          <span style={{ textDecoration: item.isCompleted ? 'line-through' : 'none', flex: 1 }}>{item.text}</span>
                        </div>
                        <div className={styles.itemAssignees}>
                          {item.assignees && item.assignees.map(a => (
                            <div key={a.id} className={styles.itemAssigneeAvatar} onClick={() => toggleChecklistItemAssignee(item, a.id)} title={`Rimuovi ${a.name}`}>
                              {a.name.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                          <select 
                            className={styles.itemAssignSelect} 
                            value="" 
                            onChange={(e) => {
                              if (e.target.value) toggleChecklistItemAssignee(item, e.target.value);
                            }}
                          >
                            <option value="">+ Assegna</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.addItemRow}>
                    <input className={styles.input} placeholder="Nuova voce..." value={newItemTexts[checklist.id] || ''} onChange={e => setNewItemTexts({...newItemTexts, [checklist.id]: e.target.value})} onKeyDown={e => e.key === 'Enter' && addChecklistItem(checklist.id)} />
                    <button onClick={() => addChecklistItem(checklist.id)} className={styles.btnSecondary}>Aggiungi</button>
                  </div>
                </div>
              );
            })}

            <div className={styles.section}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={16}/> Aggiungi Checklist</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  className={styles.input} 
                  placeholder="Titolo checklist..." 
                  value={newChecklistTitle} 
                  onChange={e => setNewChecklistTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addChecklist()}
                />
                <button className={styles.btnSecondary} onClick={addChecklist}>Aggiungi</button>
              </div>
            </div>

            {/* Attachments Section */}
            <div className={styles.section}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Paperclip size={16}/> Allegati Drive / Link</h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {attachments.map(att => (
                  <a key={att.id} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                    <ExternalLink size={14} color="var(--accent-primary)" />
                    {att.name}
                  </a>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  className={styles.input} 
                  placeholder="Nome allegato..." 
                  value={newAttachmentName} 
                  onChange={e => setNewAttachmentName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input 
                  className={styles.input} 
                  placeholder="https://drive.google.com/..." 
                  value={newAttachmentUrl} 
                  onChange={e => setNewAttachmentUrl(e.target.value)}
                  style={{ flex: 2 }}
                />
                <button className={styles.btnSecondary} onClick={addAttachment}>Allega Link</button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                *In futuro, qui comparirà il pulsante "Sfoglia Google Drive" usando le Google Picker API.
              </p>
            </div>

            {/* Comments Section */}
            <div className={styles.section}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={16}/> Commenti & Menzioni</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <textarea 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  className={styles.textarea} 
                  placeholder="Scrivi un commento e usa @ per menzionare (es. @mario)..." 
                  rows={2}
                />
                <button onClick={addComment} className={styles.saveBtn} style={{ height: 'auto' }}>Invia</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {card.comments?.map(c => (
                  <div key={c.id} style={{ background: 'var(--bg-glass)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>
                      {c.author?.name || 'Sconosciuto'} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>- {new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{c.text}</div>
                  </div>
                ))}
                {card.comments?.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nessun commento.</p>}
              </div>
            </div>

          </div>

          <div className={styles.sideCol}>
            {/* Due Date */}
            <div className={styles.widget}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14}/> Scadenza</h4>
              <input 
                type="date" 
                value={card.due ? new Date(card.due).toISOString().split('T')[0] : ''} 
                onChange={e => updateCard({ due: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={styles.input}
                style={{ width: '100%' }}
              />
            </div>

            <div className={styles.widget}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14}/> Assegnatari</h4>
              <div className={styles.assigneesList}>
                {members.map(m => {
                  const isAssigned = card.assignees.some(a => a.id === m.id);
                  return (
                    <label key={m.id} className={styles.assigneeLabel}>
                      <input 
                        type="checkbox" 
                        checked={isAssigned} 
                        onChange={() => toggleAssignee(m.id)} 
                      />
                      {m.name}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Client */}
            <div className={styles.widget}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🏢 Cliente</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className={styles.labelsList}>
                  <label className={styles.assigneeLabel}>
                    <input 
                      type="radio" 
                      name="client"
                      checked={!card.clientId} 
                      onChange={() => updateCard({ clientId: null, projectId: null })} 
                    />
                    Nessuno
                  </label>
                  {allClients.map(c => (
                    <label key={c.id} className={styles.assigneeLabel}>
                      <input 
                        type="radio" 
                        name="client"
                        checked={card.clientId === c.id} 
                        onChange={() => updateCard({ clientId: c.id, projectId: null })} 
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Nuovo Cliente..." value={newClientName} onChange={e => setNewClientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createClient()} className={styles.input} />
                  <button onClick={createClient} className={styles.btnSecondary} style={{ padding: '0.25rem 0.5rem' }}>Crea</button>
                </div>
              </div>
            </div>

            {/* Project */}
            <div className={styles.widget}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📁 Progetto {card.clientId ? '(del Cliente)' : ''}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className={styles.labelsList}>
                  <label className={styles.assigneeLabel}>
                    <input 
                      type="radio" 
                      name="project"
                      checked={!card.projectId} 
                      onChange={() => updateCard({ projectId: null })} 
                    />
                    Nessuno
                  </label>
                  {allProjects.filter(p => !card.clientId || p.clientId === card.clientId).map(p => (
                    <label key={p.id} className={styles.assigneeLabel}>
                      <input 
                        type="radio" 
                        name="project"
                        checked={card.projectId === p.id} 
                        onChange={() => updateCard({ projectId: p.id })} 
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Nuovo Progetto..." value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} className={styles.input} />
                  <button onClick={createProject} className={styles.btnSecondary} style={{ padding: '0.25rem 0.5rem' }}>Crea</button>
                </div>
              </div>
            </div>

            {/* Card Color */}
            <div className={styles.widget}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎨 Colore Scheda</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div 
                  onClick={() => updateCard({ color: null })}
                  style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
                    background: 'transparent', 
                    border: '1px dashed var(--text-secondary)',
                    boxShadow: !card.color ? '0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--text-primary)' : 'none'
                  }}
                  title="Nessun colore"
                />
                {['#a1bdcf', '#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#d8b4fe'].map(col => (
                  <div 
                    key={col}
                    onClick={() => updateCard({ color: col })}
                    style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
                      background: col, 
                      border: 'none',
                      boxShadow: card.color === col ? '0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--text-primary)' : 'none'
                    }}
                  />
                ))}
                <div style={{ position: 'relative', width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: card.color && !['#a1bdcf', '#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#d8b4fe'].includes(card.color) ? '0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--text-primary)' : 'none' }}>
                  <input 
                    type="color" 
                    value={card.color || '#ffffff'} 
                    onChange={e => updateCard({ color: e.target.value })}
                    style={{ position: 'absolute', top: '-10px', left: '-10px', width: '44px', height: '44px', cursor: 'pointer', padding: 0, border: 'none' }}
                    title="Scegli colore personalizzato"
                  />
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className={styles.widget}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={14}/> Etichette</h4>
              <div className={styles.labelsList}>
                {boardLabels.map(label => {
                  const isAssigned = card.labels.some(l => l.id === label.id);
                  return (
                    <label key={label.id} className={styles.assigneeLabel}>
                      <input 
                        type="checkbox" 
                        checked={isAssigned} 
                        onChange={() => toggleLabel(label.id)} 
                      />
                      <span className={styles.labelBadge} style={{ backgroundColor: label.color }}>{label.name}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input type="text" placeholder="Nuova etichetta..." value={newLabelName} onChange={e => setNewLabelName(e.target.value)} className={styles.input} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="color" value={newLabelColor} onChange={e => setNewLabelColor(e.target.value)} style={{ height: '32px', width: '32px', padding: 0, border: 'none', cursor: 'pointer' }} />
                  <button onClick={createLabel} className={styles.btnSecondary} style={{ flex: 1, padding: '0.25rem' }}>Crea</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
