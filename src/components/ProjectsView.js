"use client";
import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, TrendingUp, CheckSquare, Layers, Clock, DollarSign, Calendar, Tag, AlertCircle, Activity } from 'lucide-react';
import styles from './ProjectsView.module.css';
import ProjectModal from './ProjectModal';

export default function ProjectsView({ clients = [], members = [], currentUser, onRefresh, onCardClick }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Project Form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('none');
  const [newClientName, setNewClientName] = useState('');
  const [description, setDescription] = useState('');

  const [activeProject, setActiveProject] = useState(null);

  const [expandedProjects, setExpandedProjects] = useState({});
  const toggleProjectCards = (projectId) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const fetchProjects = async () => {
    setLoading(true);
    const res = await fetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        clientId: clientId === 'new' ? null : clientId, 
        newClientName: clientId === 'new' ? newClientName : null,
        description 
      })
    });
    
    setName('');
    setClientId('none');
    setNewClientName('');
    setDescription('');
    setShowForm(false);
    fetchProjects();
    if (onRefresh) onRefresh();
  };

  const openProjectModal = (project) => {
    setActiveProject(project);
  };

  const calculateEffort = (project) => {
    if (!project.cards || project.cards.length === 0) return { percent: 0, text: '0 Card collegate' };
    
    let totalItems = 0;
    let completedItems = 0;
    let hasChecklists = false;

    project.cards.forEach(card => {
      if (card.checklists && card.checklists.length > 0) {
        hasChecklists = true;
        card.checklists.forEach(cl => {
          cl.items.forEach(item => {
            totalItems++;
            if (item.isCompleted) completedItems++;
          });
        });
      }
    });

    if (hasChecklists) {
      if (totalItems === 0) return { percent: 0, text: 'Nessuna voce in checklist' };
      const percent = Math.round((completedItems / totalItems) * 100);
      return { percent, text: `${completedItems}/${totalItems} Task Completati` };
    } else {
      // If no checklists, we could base it on the list they are in (e.g. if they are in a "Fatto" list, but we don't know the list names easily here without list models).
      // Let's just say 0% for now or count cards
      return { percent: 0, text: `${project.cards.length} Card Collegate (Nessuna checklist)` };
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Caricamento Progetti...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Briefcase size={24} color="var(--accent-primary)" />
          <h2>Visione d'Insieme Progetti</h2>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nuovo Progetto
        </button>
      </header>

      {showForm && (
        <form className={styles.formPanel} onSubmit={createProject}>
          <h3>Crea Nuovo Progetto</h3>
          <div className={styles.formGrid}>
            <div>
              <label>Nome Progetto *</label>
              <input required value={name} onChange={e => setName(e.target.value)} className={styles.input} placeholder="Es. Sito Web E-commerce" />
            </div>
            <div>
              <label>Cliente</label>
              <select 
                value={clientId} 
                onChange={e => setClientId(e.target.value)} 
                className={styles.input}
              >
                <option value="none">-- Nessun Cliente --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="new">➕ Crea Nuovo Cliente...</option>
              </select>
              {clientId === 'new' && (
                <input 
                  type="text" 
                  value={newClientName} 
                  onChange={e => setNewClientName(e.target.value)} 
                  className={styles.input} 
                  placeholder="Nome del nuovo cliente..." 
                  style={{ marginTop: '0.5rem' }}
                />
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Descrizione</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className={styles.input} placeholder="Dettagli del progetto..." rows={3} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className={styles.btnSecondary}>Annulla</button>
            <button type="submit" className={styles.btnPrimary}>Salva Progetto</button>
          </div>
        </form>
      )}

      <div className={styles.projectsGrid}>
        {projects.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Nessun progetto ancora creato.
          </div>
        )}
        {projects.map(project => {
          const effort = calculateEffort(project);
          
          let statusColor = 'var(--text-secondary)';
          if (project.status === 'In Corso') statusColor = 'var(--status-in-progress, #3b82f6)';
          if (project.status === 'Completato') statusColor = 'var(--status-success)';
          if (project.status === 'Urgente' || project.priority === 'Urgente') statusColor = 'var(--status-danger)';

          return (
            <div key={project.id} className={styles.projectCard} onClick={() => openProjectModal(project)} style={{ cursor: 'pointer' }}>
              <div className={styles.projectHeader}>
                <h3 className={styles.projectName}>{project.name}</h3>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {project.status && <span className={styles.clientBadge} style={{ background: statusColor, color: '#fff' }}>{project.status}</span>}
                  {project.clientName && <span className={styles.clientBadge}>{project.clientName}</span>}
                </div>
              </div>
              
              <p className={styles.projectDesc}>{project.description || 'Nessuna descrizione. Clicca per espandere il progetto.'}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem 0' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ position: 'relative' }}>
                    <div 
                      title="Task Collegati" 
                      onClick={(e) => { e.stopPropagation(); toggleProjectCards(project.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}
                    >
                      <Layers size={14} /> <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{project.cards.length} Cards</span>
                    </div>
                    {expandedProjects[project.id] && project.cards.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', zIndex: 10, minWidth: '200px', boxShadow: 'var(--shadow-md)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Bacheche coinvolte:</div>
                        {(() => {
                          const boardMap = {};
                          project.cards.forEach(c => {
                            if (c.board) {
                              if (!boardMap[c.board.id]) boardMap[c.board.id] = { name: c.board.name, lists: new Set() };
                              if (c.list) boardMap[c.board.id].lists.add(c.list.name);
                            }
                          });
                          return Object.entries(boardMap).map(([bId, bData]) => (
                            <div 
                              key={bId} 
                              onClick={(e) => { e.stopPropagation(); if(onNavigateToBoard) onNavigateToBoard(bId); }}
                              style={{ padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(161, 189, 207, 0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ fontWeight: '600', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>📁 {bData.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Liste: {Array.from(bData.lists).join(', ')}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  {project.category && (
                    <div title="Categoria Progetto" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Tag size={14} /> <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{project.category}</span>
                    </div>
                  )}
                  {project.priority && (
                    <div title={`Priorità: ${project.priority}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: project.priority === 'Urgente' ? 'var(--status-danger)' : project.priority === 'Alta' ? 'var(--status-warning, #f59e0b)' : 'var(--text-secondary)' }}>
                      <AlertCircle size={14} /> <span style={{ fontWeight: '500' }}>{project.priority}</span>
                    </div>
                  )}
                  {project.estimatedHours && (
                    <div title="Ore consumate / Ore stimate" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} /> <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{project.actualHours || 0}/{project.estimatedHours}h</span>
                    </div>
                  )}
                  {project.effort && (
                    <div title="Livello di Effort richiesto (da 1 a 10)" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: Number(project.effort) >= 8 ? 'var(--status-danger)' : Number(project.effort) >= 5 ? 'var(--status-warning, #f59e0b)' : 'var(--status-success)' }}>
                      <Activity size={14} /> <span style={{ fontWeight: '500' }}>Effort: {project.effort}/10</span>
                    </div>
                  )}
                </div>

                {(project.sellingPrice || project.budget) && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {project.sellingPrice && (
                      <div title="Ricavi Stimati" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--status-success)', background: 'rgba(34, 197, 94, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                        <DollarSign size={14} /> <span style={{ fontWeight: 'bold' }}>Ricavi: {project.sellingPrice}€</span>
                      </div>
                    )}
                    {project.budget && (
                      <div title="Budget Costi" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--status-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
                        <DollarSign size={14} style={{ color: 'var(--status-danger)' }} /> <span style={{ fontWeight: 'bold', color: 'var(--status-danger)' }}>Costi: {project.budget}€</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

                  <div className={styles.effortContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span><TrendingUp size={12}/> Avanzamento Globale</span>
                      <span>{effort.percent}%</span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div className={styles.progressBarFill} style={{ width: `${effort.percent}%` }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                      {effort.text}
                    </div>
                  </div>

                  {project.dueDate && (
                    <div style={{ marginTop: '1rem' }}>
                      {(() => {
                        const today = new Date();
                        const due = new Date(project.dueDate);
                        // Start date assumed to be creation date
                        const start = new Date(project.createdAt);
                        const totalDays = Math.max(1, (due - start) / (1000 * 60 * 60 * 24));
                        const daysPassed = (today - start) / (1000 * 60 * 60 * 24);
                        const daysRemaining = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
                        
                        const getWorkingDays = (startDate, endDate) => {
                          if (startDate > endDate) return 0;
                          let count = 0;
                          const curDate = new Date(startDate.getTime());
                          curDate.setHours(0,0,0,0);
                          const end = new Date(endDate.getTime());
                          end.setHours(0,0,0,0);
                          while (curDate <= end) {
                            const dayOfWeek = curDate.getDay();
                            if(dayOfWeek !== 0 && dayOfWeek !== 6) count++;
                            curDate.setDate(curDate.getDate() + 1);
                          }
                          return count;
                        };
                        
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const workingDaysRemaining = daysRemaining > 0 ? getWorkingDays(tomorrow, due) : 0;
                        
                        let percentPassed = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
                        let timeColor = 'var(--status-success)';
                        if (daysRemaining <= 7) timeColor = 'var(--status-warning, #f59e0b)';
                        if (daysRemaining <= 3) timeColor = 'var(--status-danger)';
                        if (daysRemaining < 0) {
                          percentPassed = 100;
                          timeColor = 'var(--status-danger)';
                        }

                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12}/> Scadenza Timer</span>
                              <span style={{ color: timeColor, fontWeight: 'bold' }}>
                                {daysRemaining < 0 ? `Scaduto da ${Math.abs(daysRemaining)} gg` : `${daysRemaining} gg rimanenti (${workingDaysRemaining} lav.)`}
                              </span>
                            </div>
                            <div className={styles.progressBarBg} style={{ height: '6px' }}>
                              <div className={styles.progressBarFill} style={{ width: `${percentPassed}%`, background: timeColor }}></div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {project.cards && project.cards.length > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleProjectCards(project.id); }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', fontWeight: 'bold' }}
                        >
                          {expandedProjects[project.id] ? '🔼 Nascondi Task' : `🔽 Vedi Task (${project.cards.length})`}
                        </button>
                        
                        {currentUser?.aiReportEnabled !== false && (
                          <button 
                            onClick={async (e) => { 
                              e.stopPropagation();
                              const btn = e.target;
                              const originalText = btn.innerText;
                              btn.innerText = "⏳ Generazione...";
                              btn.disabled = true;
                              try {
                                const res = await fetch('/api/ai/generate-report', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ projectId: project.id })
                                });
                                const data = await res.json();
                                if (data.report) {
                                  alert("REPORT PER IL CLIENTE:\n\n" + data.report + "\n\n(Premendo OK, il testo verrà copiato negli appunti)");
                                  navigator.clipboard.writeText(data.report).catch(()=>{});
                                } else {
                                  alert("Errore AI: " + data.error);
                                }
                              } catch (err) {
                                alert("Errore connessione");
                              } finally {
                                btn.innerText = originalText;
                                btn.disabled = false;
                              }
                            }}
                            style={{ background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', padding: '0.3rem 0.6rem', fontWeight: 'bold' }}
                          >
                            ✨ Genera Report
                          </button>
                        )}
                      </div>
                      
                      {expandedProjects[project.id] && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                          {project.cards.map(card => (
                            <div 
                              key={card.id} 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (onNavigateToBoard && card.boardId) onNavigateToBoard(card.boardId); 
                              }}
                              style={{ background: 'var(--bg-glass)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', borderLeft: `3px solid ${card.color || 'var(--accent-primary)'}`, cursor: 'pointer', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                            >
                              <div style={{ fontWeight: '600', marginBottom: '0.2rem' }}>{card.name}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {card.list && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>Stato: {card.list.name}</span>}
                                {card.due && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>📅 {new Date(card.due).toLocaleDateString('it-IT')}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
            </div>
          );
        })}
      </div>

      {activeProject && (
        <ProjectModal 
          project={activeProject} 
          clients={clients} 
          members={members}
          currentUser={currentUser}
          onClose={() => setActiveProject(null)} 
          onCardClick={onCardClick}
          onRefresh={() => {
            fetchProjects();
            if (onRefresh) onRefresh();
          }} 
        />
      )}
    </div>
  );
}
