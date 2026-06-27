"use client";
import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './CardModal.module.css';

export default function DocumentImportModal({ onClose, onRefresh, boardLists, selectedBoardId }) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("Estrai ESATTAMENTE i dati da questo documento per creare una singola scheda. Organizza le informazioni in checklist logiche. NON inventare nessun dato, task o informazione esterna.");
  const [listId, setListId] = useState(boardLists && boardLists.length > 0 ? boardLists[0].id : '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) {
        setError("Il file supera il limite di 4 MB.");
        setFile(null);
      } else {
        setFile(selectedFile);
        setError('');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Seleziona un file da importare.");
      return;
    }
    if (!listId) {
      setError("Seleziona una colonna di destinazione.");
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    formData.append('listId', listId);
    formData.append('boardId', selectedBoardId);

    try {
      const res = await fetch('/api/ai/import-document', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess("Scheda generata con successo!");
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1500);
      } else {
        setError(data.error || "Errore durante l'importazione.");
      }
    } catch (err) {
      setError("Errore di connessione al server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} style={{ zIndex: 10000 }}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <header className={styles.header}>
          <h2>✨ Genera Scheda da Documento</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={loading}><X size={20} /></button>
        </header>

        <div className={styles.content} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            L'Intelligenza Artificiale leggerà il documento e creerà <strong>una singola scheda</strong> inserendo i dati estratti nella descrizione e raggruppandoli in checklist.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>File Documento</label>
            <div 
              style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-glass)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
                  <FileText size={32} />
                  <strong>{file.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <UploadCloud size={32} />
                  <span>Clicca per selezionare un file (PDF, DOCX, XLSX, CSV)</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                accept=".pdf,.docx,.xlsx,.csv,.txt"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Colonna (Lista) di Destinazione</label>
            <select 
              value={listId} 
              onChange={e => setListId(e.target.value)} 
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%' }}
            >
              {boardLists && boardLists.length > 0 ? (
                boardLists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))
              ) : (
                <option value="">-- Nessuna Lista Disponibile --</option>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Istruzioni per l'AI</label>
            <textarea 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              rows={4}
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '100%', resize: 'vertical' }}
              placeholder="Es. Estrai i nomi delle destinazioni e raggruppali per regione all'interno di checklist."
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', background: 'rgba(34, 197, 94, 0.1)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem' }}>
              <CheckCircle size={18} /> {success}
            </div>
          )}

        </div>

        <footer style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }} disabled={loading}>
            Annulla
          </button>
          <button 
            onClick={handleImport} 
            disabled={loading || !file || !listId}
            style={{ 
              background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '6px', 
              padding: '0.6rem 1.2rem', fontWeight: 'bold', cursor: loading || !file || !listId ? 'not-allowed' : 'pointer',
              opacity: loading || !file || !listId ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {loading ? '⏳ Elaborazione in corso...' : '✨ Crea Scheda'}
          </button>
        </footer>
      </div>
    </div>
  );
}
