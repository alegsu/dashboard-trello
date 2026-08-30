"use client";
import React, { useState } from 'react';
import styles from './CardModal.module.css';

export default function LeadModal({ lead, onClose, onUpdate, onDelete, users = [], onConvertToClient }) {
  const [formData, setFormData] = useState({
    companyName: lead?.companyName || '',
    contactName: lead?.contactName || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    value: lead?.value || '',
    source: lead?.source || '',
    brand: lead?.brand || 'ShinyUp',
    status: lead?.status || 'LEAD',
    notes: lead?.notes || '',
    assignedToId: lead?.assignedToId || ''
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (lead?.id) {
      // Update
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onUpdate(await res.json());
        onClose();
      }
    } else {
      // Create
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onUpdate(await res.json());
        onClose();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Vuoi davvero eliminare questo Lead?')) return;
    setSaving(true);
    const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
    if (res.ok) {
      onDelete(lead.id);
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{lead?.id ? 'Modifica Lead' : 'Nuovo Lead'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
              Azienda (Obbligatorio)
              <input required type="text" name="companyName" value={formData.companyName} onChange={handleChange} className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
              Referente
              <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
              Email
              <input type="email" name="email" value={formData.email} onChange={handleChange} className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
              Telefono
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
              Valore Stimato (€)
              <input type="number" step="0.01" name="value" value={formData.value} onChange={handleChange} className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
              Brand
              <select name="brand" value={formData.brand} onChange={handleChange} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="ShinyUp">ShinyUp</option>
                <option value="Daphlab">Daphlab</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
              Assegnato A
              <select name="assignedToId" value={formData.assignedToId} onChange={handleChange} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="">Nessuno</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
            Fonte (es. Sito, Passaparola)
            <input type="text" name="source" value={formData.source} onChange={handleChange} className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
            Note / Appunti Commerciali
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="4" className={styles.inputField} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}></textarea>
          </label>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>
              {lead?.id && (
                <button type="button" onClick={handleDelete} disabled={saving} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--status-danger)', color: 'var(--status-danger)', borderRadius: '6px', cursor: 'pointer' }}>
                  Elimina
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={onClose} style={{ padding: '0.6rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>
                Annulla
              </button>
              <button type="submit" disabled={saving} style={{ padding: '0.6rem 1rem', background: 'var(--accent-primary)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                {saving ? 'Salvataggio...' : 'Salva Lead'}
              </button>
            </div>
          </div>
          
          {lead?.id && lead?.status === 'VINTO' && onConvertToClient && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', textAlign: 'center' }}>
              <button type="button" onClick={() => onConvertToClient(lead)} style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg, #34d399, #10b981)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}>
                🎉 Converti in Cliente Operativo! 🎉
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Crea un nuovo Cliente nella Dashboard usando i dati di questo Lead.</p>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
