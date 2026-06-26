"use client";
import React, { useState, useEffect } from 'react';
import { X, Save, Folder, Clock, DollarSign, Tag, Calendar, AlertCircle } from 'lucide-react';
import styles from './CardModal.module.css'; // Possiamo riusare alcuni stili del CardModal

export default function ProjectModal({ project, clients, onClose, onRefresh }) {
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
    driveFolderId: project.driveFolderId || '',
    notes: project.notes || ''
  });

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [project.id]);

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
    const baseUrl = window.location.origin;

    await fetch(`/api/projects/${project.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newComment, authorId, baseUrl })
    });
    setNewComment('');
    fetchComments();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', display: 'flex', flexDirection: 'row', padding: '2rem' }}>
        
        {/* Main Content Area */}
        <div style={{ flex: 2, paddingRight: '1rem', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
              placeholder="Nome Progetto"
            />
          </div>

          <div>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={16}/> Descrizione Pubblica</h4>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Descrizione visibile a tutti..."
              rows={3}
            />
          </div>

          <div>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Folder size={16}/> Note Interne (PM)</h4>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className={styles.textarea}
              placeholder="Note visibili solo internamente..."
              rows={4}
              style={{ background: 'rgba(255,200,0,0.05)', borderLeft: '3px solid #ffcc00' }}
            />
          </div>

          {/* Comments Section */}
          <div style={{ marginTop: '1rem' }}>
            <h4>Commenti del Progetto</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <textarea 
                value={newComment} 
                onChange={e => setNewComment(e.target.value)} 
                className={styles.textarea} 
                placeholder="Scrivi un commento e usa @ per menzionare..." 
                rows={2}
              />
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

        {/* Sidebar Data Area */}
        <div style={{ flex: 1, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>

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
              <input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Es. Sviluppo Web" style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
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

          <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.6rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
            <button onClick={async () => {
              if(window.confirm('Vuoi archiviare questo progetto?')) {
                await fetch(`/api/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isArchived: true }) });
                if (onRefresh) onRefresh();
                onClose();
              }
            }} style={{ width: '100%', background: 'transparent', color: 'var(--status-warning)', border: '1px solid var(--status-warning)', borderRadius: '4px', padding: '0.6rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              Archivia Progetto
            </button>
            <button onClick={onClose} style={{ width: '100%', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.6rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <X size={16} /> Chiudi
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
