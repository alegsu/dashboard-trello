"use client";
import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CheckSquare, Clock, Tag, MessageSquare, Paperclip, ExternalLink, Copy, Archive, Trash2, Plus, Brain } from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from './CardModal.module.css';

export default function CardModal({ cardId, members, onClose, onRefresh, onDeleteCard, currentUser, onOpenNotebook }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [description, setDescription] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState({});
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  // Checklist Item Notes State
  const [openNotes, setOpenNotes] = useState({});
  const [itemNotes, setItemNotes] = useState({});

  // AI Summary
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Edit states for checklists and items
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [showSubItemInput, setShowSubItemInput] = useState({});
  const [showChecklistItemInput, setShowChecklistItemInput] = useState({});
  const [showAssigneesDropdown, setShowAssigneesDropdown] = useState(false);


  
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionTarget, setMentionTarget] = useState(null);

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
    updates.baseUrl = window.location.origin;
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
      if (onDeleteCard) onDeleteCard(cardId);
      onRefresh();
      onClose();
    }
  };

  const deleteCard = async () => {
    if (window.confirm("Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questa scheda? L'azione è irreversibile.")) {
      await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (onDeleteCard) onDeleteCard(cardId);
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
      updateCard({ clientId: newClient.id, projectId: null });
      setNewClientName('');
    }
  };

  const saveChecklistItemNotes = async (itemId, notes) => {
    try {
      const res = await fetch(`/api/checklist-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes,
          authorId: currentUser?.id,
          baseUrl: window.location.origin
        })
      });
      if (res.ok) {
        fetchCard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleNotes = (itemId, currentNotes) => {
    if (!openNotes[itemId]) {
      setItemNotes(prev => ({ ...prev, [itemId]: currentNotes || '' }));
    }
    setOpenNotes(prev => ({ ...prev, [itemId]: !prev[itemId] }));
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

  const addChecklistSubItem = async (checklistId, parentId) => {
    const text = newItemTexts[parentId];
    if (!text || !text.trim()) return;
    await fetch('/api/checklist-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, checklistId, parentId })
    });
    setNewItemTexts({ ...newItemTexts, [parentId]: '' });
    setShowSubItemInput(prev => ({ ...prev, [parentId]: false }));
    fetchCard();
  };

  const updateChecklist = async (id, data) => {
    await fetch(`/api/checklists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetchCard();
  };

  const deleteChecklist = async (id) => {
    if (!confirm('Eliminare intera checklist?')) return;
    await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
    fetchCard();
  };

  const updateChecklistItem = async (id, data) => {
    await fetch(`/api/checklist-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetchCard();
  };

  const deleteChecklistItem = async (id) => {
    if (!confirm('Eliminare questa voce?')) return;
    await fetch(`/api/checklist-items/${id}`, { method: 'DELETE' });
    fetchCard();
  };

  const swapChecklistOrder = async (index, direction) => {
    const arr = [...card.checklists];
    if (direction === 'up' && index > 0) {
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    } else if (direction === 'down' && index < arr.length - 1) {
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    } else return;
    
    // Update all
    await Promise.all(arr.map((c, i) => fetch(`/api/checklists/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: i })
    })));
    fetchCard();
  };

  const swapItemOrder = async (itemsList, index, direction) => {
    const arr = [...itemsList];
    if (direction === 'up' && index > 0) {
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    } else if (direction === 'down' && index < arr.length - 1) {
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
    } else return;
    
    await Promise.all(arr.map((item, i) => fetch(`/api/checklist-items/${item.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: i })
    })));
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
        origin: { y: 0.7 },
        zIndex: 10000
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
      body: JSON.stringify({ text: newComment, authorId, mentions, baseUrl: window.location.origin })
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
          <input 
            value={card.name || ''}
            onChange={(e) => setCard({ ...card, name: e.target.value })}
            onBlur={() => {
              if (card.name && card.name.trim() !== '') {
                updateCard({ name: card.name });
              }
            }}
            onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur() }}
            style={{ 
              fontSize: '1.5rem', fontWeight: 'bold', background: 'transparent', 
              border: '1px solid transparent', color: 'var(--text-primary)', 
              width: '100%', outline: 'none', borderRadius: '4px', 
              padding: '0.2rem 0.5rem', margin: '0 -0.5rem' 
            }}
            title="Clicca per modificare il titolo"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(() => {
              const currentClient = allClients.find(c => c.id === card.clientId);
              const visibleAccesses = currentClient?.accesses?.filter(a => a.showInCard) || [];
              return (
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {currentClient && (
                    <button 
                      onClick={() => { if (onOpenNotebook) onOpenNotebook(currentClient); }} 
                      title={`Apri Notebook: ${currentClient.name}`}
                      style={{ background: 'var(--accent-primary)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', fontSize: '0.9rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      🧠
                    </button>
                  )}
                  {currentClient?.claudeUrl && (
                    <a 
                      href={currentClient.claudeUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      title={`Apri Progetto Claude (${currentClient.name})`}
                      style={{ background: '#d97757', border: '1px solid #d97757', color: 'white', textDecoration: 'none', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}
                    >
                      🤖
                    </a>
                  )}
                  {visibleAccesses.length > 0 && (
                    <div style={{ position: 'relative' }} className="access-dropdown-container">
                      <button 
                        onClick={(e) => {
                          e.currentTarget.nextElementSibling.style.display = e.currentTarget.nextElementSibling.style.display === 'none' ? 'block' : 'none';
                        }} 
                        title="Vedi Accessi" 
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}
                      >
                        🔑
                      </button>
                      <div style={{ display: 'none', position: 'absolute', top: '100%', right: 0, width: '250px', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginTop: '0.3rem' }}>
                        <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Credenziali {currentClient.name}</h5>
                        {visibleAccesses.map(a => (
                          <div key={a.id} style={{ marginBottom: '0.5rem', background: 'var(--bg-primary)', padding: '0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{a.name}</strong>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}><span>User:</span> <span onClick={() => navigator.clipboard.writeText(a.username)} style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} title="Copia">{a.username || '-'}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pass:</span> <span onClick={() => navigator.clipboard.writeText(a.password)} style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} title="Copia">••••••••</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <button title="Copia Scheda" onClick={copyCard} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <Copy size={14} />
            </button>
            <button title="Archivia Scheda" onClick={archiveCard} style={{ background: 'transparent', border: '1px solid var(--status-warning)', color: 'var(--status-warning)', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <Archive size={14} />
            </button>
            <button title="Elimina Scheda" onClick={deleteCard} style={{ background: 'transparent', border: '1px solid var(--status-danger)', color: 'var(--status-danger)', cursor: 'pointer', padding: '0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={14} />
            </button>
            <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.mainCol}>
            
            {aiSummary && (
              <div className={styles.section} style={{ background: 'linear-gradient(to right, rgba(var(--accent-rgb), 0.05), transparent)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>✨ Intelligenza Artificiale</h3>
                  <button onClick={() => setAiSummary('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                {aiError && <div style={{ color: 'var(--status-danger)', fontSize: '0.85rem' }}>{aiError}</div>}
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                  {aiSummary}
                </div>
              </div>
            )}

            <div className={styles.section}>
              <h3>Descrizione</h3>
              <div style={{ position: 'relative' }}>
                <textarea 
                  id="textarea-description"
                  value={description} 
                  onChange={e => handleMentionChange(e.target.value, 'description', setDescription)} 
                  onBlur={handleSaveDescription}
                  className={styles.textarea} 
                  placeholder="Aggiungi una descrizione più dettagliata... (usa @ per menzionare)" 
                  rows={4}
                />
                {renderMentionDropdown('description', description, setDescription)}
              </div>
            </div>

            {card.checklists.map((checklist, cIdx) => {
              const allItems = checklist.items || [];
              const topLevelItems = allItems.filter(i => !i.parentId).sort((a,b) => a.order - b.order);
              const completed = allItems.filter(i => i.isCompleted).length;
              const total = allItems.length;
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
              
              const renderItem = (item, isSubItem = false, index, listArr) => {
                const subItems = allItems.filter(i => i.parentId === item.id).sort((a,b) => a.order - b.order);
                const isEditing = editingItemId === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <li className={styles.checklistItem} style={{ flexDirection: 'column', alignItems: 'flex-start', marginLeft: isSubItem ? '2rem' : '0', borderLeft: isSubItem ? '2px solid var(--border-color)' : 'none', paddingLeft: isSubItem ? '1rem' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <input type="checkbox" checked={item.isCompleted} onChange={() => toggleChecklistItem(item.id, item.isCompleted)} />
                          {isEditing ? (
                            <input 
                              type="text" 
                              className={styles.input} 
                              value={editingItemText} 
                              onChange={e => setEditingItemText(e.target.value)}
                              style={{ flex: 1, padding: '0.2rem' }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  updateChecklistItem(item.id, { text: editingItemText });
                                  setEditingItemId(null);
                                } else if (e.key === 'Escape') setEditingItemId(null);
                              }}
                              autoFocus
                              onBlur={() => {
                                updateChecklistItem(item.id, { text: editingItemText });
                                setEditingItemId(null);
                              }}
                            />
                          ) : (
                            <span style={{ textDecoration: item.isCompleted ? 'line-through' : 'none', flex: 1, cursor: 'text' }} onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}>{item.text}</span>
                          )}
                        </div>
                        <div className={styles.itemActions} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <button onClick={() => swapItemOrder(listArr, index, 'up')} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text-secondary)' }} disabled={index === 0}>↑</button>
                          <button onClick={() => swapItemOrder(listArr, index, 'down')} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text-secondary)' }} disabled={index === listArr.length - 1}>↓</button>
                          <button onClick={() => deleteChecklistItem(item.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--status-danger)' }} title="Elimina voce"><Trash2 size={14}/></button>
                          
                          {!isSubItem && (
                            <button 
                              title="Aggiungi sotto-task"
                              onClick={() => setShowSubItemInput(prev => ({ ...prev, [item.id]: true }))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Plus size={14} />
                            </button>
                          )}

                          <button 
                            title="Note / Commenti"
                            onClick={() => toggleNotes(item.id, item.notes)}
                            style={{ background: 'transparent', border: 'none', color: item.notes ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}
                          >
                            <MessageSquare size={14} />
                          </button>
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
                        </div>
                      </div>
                      
                      {item.notes && !openNotes[item.id] && (
                        <div 
                          style={{ width: '100%', marginTop: '0.2rem', paddingLeft: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'pre-wrap' }}
                          onClick={() => toggleNotes(item.id, item.notes)}
                        >
                          <div style={{ background: 'rgba(var(--accent-rgb), 0.05)', padding: '0.5rem', borderRadius: '4px', borderLeft: '2px solid var(--accent-primary)' }}>
                            {item.notes}
                          </div>
                        </div>
                      )}
                      {openNotes[item.id] && (
                        <div style={{ width: '100%', marginTop: '0.5rem', position: 'relative', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              id={`textarea-item-notes-${item.id}`}
                              value={itemNotes[item.id] !== undefined ? itemNotes[item.id] : (item.notes || '')}
                              onChange={e => handleMentionChange(e.target.value, `item-notes-${item.id}`, val => setItemNotes(prev => ({ ...prev, [item.id]: val })))}
                              className={styles.textarea}
                              placeholder="Aggiungi istruzioni o note per questa voce... (usa @ per menzionare)"
                              rows={2}
                              style={{ fontSize: '0.85rem' }}
                            />
                            {renderMentionDropdown(`item-notes-${item.id}`, itemNotes[item.id] !== undefined ? itemNotes[item.id] : (item.notes || ''), val => setItemNotes(prev => ({ ...prev, [item.id]: val })))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={(e) => {
                                const btn = e.target;
                                const originalText = btn.innerText;
                                btn.innerText = "Salvato ✓";
                                btn.style.background = "var(--status-success)";
                                saveChecklistItemNotes(item.id, itemNotes[item.id] !== undefined ? itemNotes[item.id] : item.notes);
                                setTimeout(() => {
                                  btn.innerText = originalText;
                                  btn.style.background = "var(--bg-elevated)";
                                }, 2000);
                              }}
                              className={styles.btnSecondary}
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', transition: 'all 0.3s ease' }}
                            >
                              Salva Nota
                            </button>
                          </div>
                        </div>
                      )}
                    </li>

                    {/* SubItems */}
                    {!isSubItem && subItems.map((sub, sIdx) => renderItem(sub, true, sIdx, subItems))}
                    
                    {/* Add SubItem Input */}
                    {!isSubItem && showSubItemInput[item.id] && (
                      <div style={{ marginLeft: '2rem', marginTop: '0.2rem' }}>
                        <div className={styles.addItemRow} style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <input 
                            className={styles.input} 
                            style={{ flex: 1, fontSize: '0.8rem', padding: '0.3rem' }} 
                            placeholder="Aggiungi sotto-task..." 
                            value={newItemTexts[item.id] || ''} 
                            onChange={e => setNewItemTexts({...newItemTexts, [item.id]: e.target.value})} 
                            onKeyDown={e => {
                              if (e.key === 'Enter') addChecklistSubItem(checklist.id, item.id);
                              else if (e.key === 'Escape') setShowSubItemInput(prev => ({ ...prev, [item.id]: false }));
                            }}
                            autoFocus
                            onBlur={() => {
                              if (!newItemTexts[item.id]) setShowSubItemInput(prev => ({ ...prev, [item.id]: false }));
                            }}
                          />
                          <button onClick={() => addChecklistSubItem(checklist.id, item.id)} className={styles.btnSecondary} style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', background: 'var(--accent-primary)', color: 'white' }} title="Aggiungi Sotto-task">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              };

              return (
                <div key={checklist.id} className={styles.section} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                      <CheckSquare size={16}/> 
                      {editingChecklistId === checklist.id ? (
                        <input 
                          type="text" 
                          className={styles.input} 
                          value={editingChecklistTitle} 
                          onChange={e => setEditingChecklistTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateChecklist(checklist.id, { title: editingChecklistTitle });
                              setEditingChecklistId(null);
                            } else if (e.key === 'Escape') setEditingChecklistId(null);
                          }}
                          onBlur={() => {
                            updateChecklist(checklist.id, { title: editingChecklistTitle });
                            setEditingChecklistId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <h3 style={{ margin: 0, cursor: 'pointer' }} onClick={() => { setEditingChecklistId(checklist.id); setEditingChecklistTitle(checklist.title); }}>{checklist.title}</h3>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <button onClick={() => swapChecklistOrder(cIdx, 'up')} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text-secondary)' }} disabled={cIdx === 0}>↑</button>
                      <button onClick={() => swapChecklistOrder(cIdx, 'down')} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text-secondary)' }} disabled={cIdx === card.checklists.length - 1}>↓</button>
                      <button onClick={() => deleteChecklist(checklist.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--status-danger)' }} title="Elimina Checklist"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '2.5rem' }}>{percent}%</span>
                    <div className={styles.progressBarBg} style={{ flex: 1, margin: 0 }}>
                      <div className={styles.progressBarFill} style={{ width: `${percent}%`, background: percent === 100 ? 'var(--status-success)' : `hsl(${Math.round((percent / 100) * 120)}, 70%, 50%)`, transition: 'all 0.3s ease' }}></div>
                    </div>
                  </div>
                  <ul className={styles.checklistItems}>
                    {topLevelItems.map((item, idx) => renderItem(item, false, idx, topLevelItems))}
                  </ul>
                  {!showChecklistItemInput[checklist.id] ? (
                    <button 
                      onClick={() => setShowChecklistItemInput(prev => ({ ...prev, [checklist.id]: true }))} 
                      className={styles.btnSecondary} 
                      style={{ marginTop: '0.5rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', width: '100%', display: 'flex', justifyContent: 'flex-start', padding: '0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}
                    >
                      <Plus size={16} style={{ marginRight: '0.3rem' }} /> Nuovo task...
                    </button>
                  ) : (
                    <div className={styles.addItemRow} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        className={styles.input} 
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }} 
                        placeholder="Nuovo task..." 
                        value={newItemTexts[checklist.id] || ''} 
                        onChange={e => setNewItemTexts({...newItemTexts, [checklist.id]: e.target.value})} 
                        onKeyDown={e => e.key === 'Enter' && addChecklistItem(checklist.id)} 
                        autoFocus
                        onBlur={() => {
                          if (!newItemTexts[checklist.id]) setShowChecklistItemInput(prev => ({ ...prev, [checklist.id]: false }));
                        }}
                      />
                      <button onClick={() => addChecklistItem(checklist.id)} className={styles.btnSecondary} style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'var(--accent-primary)', color: 'white' }} title="Aggiungi">
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className={styles.section} style={{ padding: '0.5rem 0' }}>
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ outline: 'none', userSelect: 'none', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={16} color="var(--text-secondary)" /> Nuovo Task (Checklist)
                  </div>
                </summary>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', paddingLeft: '1.5rem', cursor: 'default' }}>
                  <input 
                    className={styles.input} 
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}
                    placeholder="Titolo per nuova Task (checklist)..." 
                    value={newChecklistTitle} 
                    onChange={e => setNewChecklistTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addChecklist()}
                  />
                  <button className={styles.btnSecondary} style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'var(--accent-primary)', color: 'white' }} onClick={addChecklist} title="Aggiungi Checklist">
                    <Plus size={16} />
                  </button>
                </div>
              </details>
            </div>

            {/* Attachments Section */}
            <div className={styles.section}>
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ outline: 'none', userSelect: 'none', fontWeight: 'bold' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Paperclip size={16}/> Allegati Drive / Link
                  </div>
                </summary>
                
                <div style={{ marginTop: '1rem', paddingLeft: '1.5rem', cursor: 'default' }}>
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
              </details>
            </div>

            {/* Comments Section */}
            <div className={styles.section}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={16}/> Commenti & Menzioni</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', position: 'relative' }}>
                <textarea 
                  id="textarea-comment"
                  value={newComment} 
                  onChange={e => handleMentionChange(e.target.value, 'comment', setNewComment)} 
                  className={styles.textarea} 
                  placeholder="Scrivi un commento e usa @ per menzionare (es. @mario)..." 
                  rows={2}
                />
                
                {renderMentionDropdown('comment', newComment, setNewComment)}

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
            {/* AI Action */}
            <div className={styles.widget} style={{ border: '1px solid var(--accent-primary)', background: 'rgba(161, 189, 207, 0.05)', padding: '0.5rem' }}>
              <button 
                onClick={generateAiSummary} 
                disabled={loadingSummary}
                className={styles.btnSecondary}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontSize: '0.8rem', padding: '0.3rem' }}
              >
                ✨ {loadingSummary ? '...' : 'Riassumi (AI)'}
              </button>
            </div>

            {/* Due Date */}
            <div className={styles.widget} style={{ padding: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}><Calendar size={14}/> Scadenza</h4>
              <input 
                type="date" 
                value={card.due ? new Date(card.due).toISOString().split('T')[0] : ''} 
                onChange={e => updateCard({ due: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={styles.input}
                style={{ width: '100%', padding: '0.2rem', fontSize: '0.8rem' }}
              />
            </div>

            <div className={styles.widget} style={{ padding: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}><User size={14}/> Assegnatari</h4>
              <div style={{ position: 'relative' }}>
                <div 
                  className={styles.input} 
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', padding: '0.2rem', cursor: 'pointer', minHeight: '26px', alignItems: 'center', fontSize: '0.8rem' }}
                  onClick={() => setShowAssigneesDropdown(!showAssigneesDropdown)}
                >
                  {card.assignees.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>Nessuno</span>}
                  {card.assignees.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--accent-primary)', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      {a.name}
                    </div>
                  ))}
                </div>
                {showAssigneesDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', marginTop: '0.2rem', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                    {members.map(m => {
                      const isAssigned = card.assignees.some(a => a.id === m.id);
                      return (
                        <label key={m.id} className={styles.assigneeLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem' }}>
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
                )}
              </div>
            </div>

            {/* Client */}
            <div className={styles.widget} style={{ padding: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}>🏢 Cliente</h4>
              <select 
                className={styles.input} 
                value={card.clientId || ''} 
                onChange={(e) => updateCard({ clientId: e.target.value || null, projectId: null })}
                style={{ padding: '0.2rem', borderRadius: '4px', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="">Nessuno</option>
                {allClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div className={styles.widget} style={{ padding: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}>📁 Progetto</h4>
              <select 
                className={styles.input} 
                value={card.projectId || ''} 
                onChange={(e) => updateCard({ projectId: e.target.value || null })}
                style={{ padding: '0.2rem', borderRadius: '4px', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="">Nessuno</option>
                {allProjects.filter(p => !card.clientId || p.clientId === card.clientId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Card Color */}
            <div className={styles.widget} style={{ padding: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}>🎨 Colore</h4>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div 
                  onClick={() => updateCard({ color: null })}
                  style={{ 
                    width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer',
                    background: 'transparent', 
                    border: '1px dashed var(--text-secondary)',
                    boxShadow: !card.color ? '0 0 0 2px var(--bg-secondary), 0 0 0 2px var(--text-primary)' : 'none'
                  }}
                  title="Nessuno"
                />
                {['#a1bdcf', '#fca5a5', '#fcd34d', '#86efac', '#93c5fd'].map(col => (
                  <div 
                    key={col}
                    onClick={() => updateCard({ color: col })}
                    style={{ 
                      width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer',
                      background: col, 
                      border: 'none',
                      boxShadow: card.color === col ? '0 0 0 2px var(--bg-secondary), 0 0 0 2px var(--text-primary)' : 'none'
                    }}
                  />
                ))}
                <div style={{ position: 'relative', width: '18px', height: '18px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: card.color && !['#a1bdcf', '#fca5a5', '#fcd34d', '#86efac', '#93c5fd'].includes(card.color) ? '0 0 0 2px var(--bg-secondary), 0 0 0 2px var(--text-primary)' : 'none' }}>
                  <input 
                    type="color" 
                    value={card.color || '#ffffff'} 
                    onChange={e => updateCard({ color: e.target.value })}
                    style={{ position: 'absolute', top: '-10px', left: '-10px', width: '38px', height: '38px', cursor: 'pointer', padding: 0, border: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className={styles.widget} style={{ padding: '0.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem 0', fontSize: '0.8rem' }}><Tag size={14}/> Etichette</h4>
              
              <div 
                className={styles.input} 
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', padding: '0.2rem', cursor: 'pointer', minHeight: '26px', alignItems: 'center', fontSize: '0.8rem', position: 'relative' }}
                onClick={(e) => {
                  const dropdown = e.currentTarget.nextElementSibling;
                  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                }}
              >
                {card.labels.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>Nessuna</span>}
                {card.labels.map(l => (
                  <span key={l.id} style={{ backgroundColor: l.color, color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.75rem' }}>{l.name}</span>
                ))}
              </div>
              <div style={{ display: 'none', position: 'absolute', right: '1rem', width: '220px', zIndex: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', marginTop: '0.2rem', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                <div className={styles.labelsList} style={{ gap: '0.2rem' }}>
                  {boardLabels.map(label => {
                    const isAssigned = card.labels.some(l => l.id === label.id);
                    return (
                      <label key={label.id} className={styles.assigneeLabel} style={{ padding: '0.2rem', fontSize: '0.8rem', gap: '0.4rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isAssigned} 
                          onChange={() => toggleLabel(label.id)} 
                        />
                        <span className={styles.labelBadge} style={{ backgroundColor: label.color, flex: 1, padding: '0.1rem 0.4rem' }}>{label.name}</span>
                      </label>
                    );
                  })}
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <input type="text" placeholder="Nuova etichetta..." value={newLabelName} onChange={e => setNewLabelName(e.target.value)} className={styles.input} style={{ fontSize: '0.8rem', padding: '0.2rem' }} />
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <input type="color" value={newLabelColor} onChange={e => setNewLabelColor(e.target.value)} style={{ height: '24px', width: '24px', padding: 0, border: 'none', cursor: 'pointer' }} />
                    <button onClick={createLabel} className={styles.btnSecondary} style={{ flex: 1, padding: '0.1rem', fontSize: '0.75rem' }}>Crea</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
