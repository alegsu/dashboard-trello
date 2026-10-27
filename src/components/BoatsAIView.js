"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Anchor,
  Compass,
  Ship,
  FileText,
  Send,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Sparkles,
  Download,
  Eye,
  ExternalLink,
  Play,
  Edit3,
  X
} from 'lucide-react';

export default function BoatsAIView({ currentUser }) {
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);

  // Impostazioni
  const [enabled, setEnabled] = useState(false);
  const [phone1, setPhone1] = useState('+39 391 351 4685');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [driveApiKey, setDriveApiKey] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);

  // Sincronizzazione Google Drive
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncResult, setDriveSyncResult] = useState(null);

  // Modale Dettagli / Modifica Scheda Barca
  const [editingBoat, setEditingBoat] = useState(null);

  // Simulatore WhatsApp
  const [simulatorMessages, setSimulatorMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: '⚓ Ciao Alessandro! Sono l\'Assistente Nautico AI. Chiedimi qualsiasi informazione sulle barche a catalogo o chiedimi di inviarti la scheda tecnica in allegato!',
      timestamp: '10:00',
      attachment: null
    }
  ]);
  const [simulatorInput, setSimulatorInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const fileInputRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Carica barche e configurazione
  const fetchBoatsAndSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/boats?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBoats(data.boats || []);
        if (data.settings) {
          setEnabled(Boolean(data.settings.enabled));
          const phones = (data.settings.testPhones || '').split(',').map(p => p.trim());
          if (phones[0]) setPhone1(phones[0]);
          if (phones[1]) setPhone2(phones[1]);
          if (phones[2]) setPhone3(phones[2]);
          if (data.settings.driveFolderUrl) setDriveFolderUrl(data.settings.driveFolderUrl);
          if (data.settings.driveApiKey) setDriveApiKey(data.settings.driveApiKey);
        }
      }
    } catch (err) {
      console.error('[BoatsAI] Errore caricamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoatsAndSettings();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [simulatorMessages, isSimulating]);

  // Salva impostazioni di test
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const testPhonesArray = [phone1, phone2, phone3].map(p => p.trim()).filter(Boolean);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BOAT_AI_ENABLED: enabled ? 'true' : 'false',
          BOAT_AI_TEST_PHONES: testPhonesArray.join(', '),
          BOAT_AI_GOOGLE_DRIVE_FOLDER_URL: driveFolderUrl.trim(),
          BOAT_AI_GOOGLE_API_KEY: driveApiKey.trim()
        })
      });

      if (res.ok) {
        setSettingsFeedback({ type: 'success', message: '✅ Impostazioni salvate con successo!' });
      } else {
        setSettingsFeedback({ type: 'error', message: '❌ Errore durante il salvataggio' });
      }
    } catch (err) {
      setSettingsFeedback({ type: 'error', message: '❌ ' + err.message });
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setSettingsFeedback(null), 4000);
    }
  };

  // Caricamento diretto file PDF
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Carica un file in formato PDF.');
      return;
    }

    setIsUploading(true);
    setUploadFeedback({ type: 'info', message: `Lettura del PDF ed estrazione caratteristiche con IA in corso... (${file.name})` });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/boats', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const newBoat = await res.json();
        setBoats(prev => [newBoat, ...prev]);
        setUploadFeedback({ type: 'success', message: `✨ Scheda barca "${newBoat.title}" estratta e aggiunta con successo!` });
      } else {
        const errData = await res.json().catch(() => ({}));
        setUploadFeedback({ type: 'error', message: `❌ Errore: ${errData.error || 'Impossibile elaborare il PDF'}` });
      }
    } catch (err) {
      setUploadFeedback({ type: 'error', message: `❌ Errore caricamento: ${err.message}` });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadFeedback(null), 6000);
    }
  };

  // Sincronizza da Google Drive
  const handleSyncDrive = async () => {
    if (!driveFolderUrl) {
      alert('Inserisci l\'URL o l\'ID della cartella Google Drive.');
      return;
    }

    setIsSyncingDrive(true);
    setDriveSyncResult(null);

    try {
      const res = await fetch('/api/boats/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveFolderUrl,
          driveApiKey
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDriveSyncResult({
          type: 'success',
          message: `🎉 Sincronizzazione completata! Nuove schede importate: ${data.imported} (su ${data.totalPdfs || 0} PDF rilevati).`
        });
        fetchBoatsAndSettings();
      } else if (data.needApiKey) {
        setDriveSyncResult({
          type: 'warning',
          message: data.message
        });
      } else {
        setDriveSyncResult({
          type: 'error',
          message: `❌ Errore: ${data.error || 'Impossibile sincronizzare da Google Drive'}`
        });
      }
    } catch (err) {
      setDriveSyncResult({ type: 'error', message: `❌ Errore: ${err.message}` });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Toggle stato attivo scheda barca
  const handleToggleBoatActive = async (boat) => {
    const newStatus = !boat.isActive;
    setBoats(prev => prev.map(b => b.id === boat.id ? { ...b, isActive: newStatus } : b));
    await fetch(`/api/boats/${boat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newStatus })
    });
  };

  // Elimina scheda barca
  const handleDeleteBoat = async (boatId, title) => {
    if (!confirm(`Sei sicuro di voler eliminare la scheda della barca "${title}"?`)) return;
    setBoats(prev => prev.filter(b => b.id !== boatId));
    await fetch(`/api/boats/${boatId}`, { method: 'DELETE' });
  };

  // Salva modifiche manuali a una scheda
  const handleUpdateBoatDetails = async (e) => {
    e.preventDefault();
    if (!editingBoat) return;

    try {
      const res = await fetch(`/api/boats/${editingBoat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBoat)
      });
      if (res.ok) {
        const updated = await res.json();
        setBoats(prev => prev.map(b => b.id === updated.id ? updated : b));
        setEditingBoat(null);
      }
    } catch (err) {
      alert('Errore aggiornamento: ' + err.message);
    }
  };

  // Invio messaggio nel simulatore WhatsApp
  const handleSendSimulation = async (textToSend) => {
    const text = (textToSend || simulatorInput).trim();
    if (!text || isSimulating) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    };

    setSimulatorMessages(prev => [...prev, userMsg]);
    setSimulatorInput('');
    setIsSimulating(true);

    try {
      const res = await fetch('/api/boats/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          senderName: currentUser?.name || 'Alessandro',
          senderPhone: phone1 || '+39 391 351 4685'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.replyMessage,
          timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          attachment: data.sendAttachment && data.boat ? {
            title: data.boat.title,
            fileName: data.boat.fileName || `${data.boat.title}.pdf`,
            downloadUrl: `/api/boats/download/${data.boat.id}`,
            boatId: data.boat.id
          } : null
        };
        setSimulatorMessages(prev => [...prev, aiMsg]);
      } else {
        setSimulatorMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: '⚠️ Errore durante l\'elaborazione della risposta.',
            timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setSimulatorMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: '⚠️ Errore di connessione: ' + err.message,
          timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Intestazione Principale */}
      <div style={{
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(6, 182, 212, 0.3)'
          }}>
            <Ship size={28} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Assistente Nautico AI (WhatsApp Demo)
              </h2>
              <span style={{
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#06b6d4',
                border: '1px solid #06b6d4',
                padding: '0.15rem 0.6rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                🔒 Riservato Alessandro
              </span>
            </div>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Ambiente di test parallelo isolato: carica le schede da Google Drive o PDF e ricevi informazioni o brochure direttamente su WhatsApp.
            </p>
          </div>
        </div>

        {/* Toggle Attivazione Live su WhatsApp */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          background: 'var(--bg-primary)',
          padding: '0.5rem 1rem',
          borderRadius: '30px',
          border: '1px solid var(--border-color)'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: enabled ? '#10b981' : 'var(--text-secondary)' }}>
            {enabled ? '🟢 Assistente Attivo su WhatsApp' : '⚪ Assistente in Pausa'}
          </span>
          <button
            onClick={() => {
              const nextState = !enabled;
              setEnabled(nextState);
              fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ BOAT_AI_ENABLED: nextState ? 'true' : 'false' })
              });
            }}
            style={{
              background: enabled ? '#10b981' : 'var(--border-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              padding: '0.3rem 0.8rem',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              transition: 'all 0.2s'
            }}
          >
            {enabled ? 'Disattiva' : 'Attiva Ora'}
          </button>
        </div>
      </div>

      {/* Griglia a 2 colonne: Configurazione & Importazione */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.2rem' }}>
        
        {/* CARD 1: Numeri di Test Abilitati (3 Numeri) */}
        <div style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.3rem',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Phone size={20} color="#06b6d4" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Numeri WhatsApp Abilitati al Test</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            I messaggi WhatsApp provenienti da questi 3 numeri parleranno <b>esclusivamente</b> con l&apos;assistente nautico (non creeranno task o schede nel gestionale).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                Numero 1 (Alessandro):
              </label>
              <input
                type="text"
                value={phone1}
                onChange={e => setPhone1(e.target.value)}
                placeholder="+39 391 351 4685"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                Numero 2 (Cliente / Test):
              </label>
              <input
                type="text"
                value={phone2}
                onChange={e => setPhone2(e.target.value)}
                placeholder="+39 340 000 0000"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                Numero 3 (Collaboratore / Test):
              </label>
              <input
                type="text"
                value={phone3}
                onChange={e => setPhone3(e.target.value)}
                placeholder="+39 333 000 0000"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.2rem',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <CheckCircle2 size={16} />
              {isSavingSettings ? 'Salvataggio...' : 'Salva Numeri'}
            </button>

            {settingsFeedback && (
              <span style={{
                fontSize: '0.8rem',
                color: settingsFeedback.type === 'success' ? '#10b981' : '#ef4444',
                fontWeight: 600
              }}>
                {settingsFeedback.message}
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: Google Drive & Caricamento Diretto PDF */}
        <div style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.3rem',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Compass size={20} color="#06b6d4" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Sorgente Schede: Google Drive & PDF</h3>
          </div>

          {/* Sincronizzazione Google Drive */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Link Cartella Google Drive Condivisa:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={driveFolderUrl}
                onChange={e => setDriveFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                style={{
                  flex: 1,
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
              <button
                onClick={handleSyncDrive}
                disabled={isSyncingDrive}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid #06b6d4',
                  color: '#06b6d4',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <RefreshCw size={14} className={isSyncingDrive ? 'animate-spin' : ''} />
                {isSyncingDrive ? 'Sincronizzo...' : 'Sincronizza'}
              </button>
            </div>

            {/* Opzionale: Google API Key */}
            <input
              type="password"
              value={driveApiKey}
              onChange={e => setDriveApiKey(e.target.value)}
              placeholder="Google API Key opzionale (per lettura automatica cartella)"
              style={{
                width: '100%',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem'
              }}
            />

            {driveSyncResult && (
              <div style={{
                fontSize: '0.75rem',
                padding: '0.5rem',
                borderRadius: '6px',
                background: driveSyncResult.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: driveSyncResult.type === 'success' ? '#10b981' : '#f87171',
                border: `1px solid ${driveSyncResult.type === 'success' ? '#10b981' : '#ef4444'}`
              }}>
                {driveSyncResult.message}
              </div>
            )}
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.2rem 0' }} />

          {/* Caricamento Diretto PDF con Drag & Drop */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Upload size={24} color="#06b6d4" />
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isUploading ? 'Analisi IA del PDF in corso...' : 'Carica Scheda PDF (Drag & Drop)'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                L&apos;IA estrarrà in automatico modello, specifiche, motori e dotazioni
              </div>
            </div>

            {uploadFeedback && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                padding: '0.5rem',
                borderRadius: '6px',
                background: uploadFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                color: uploadFeedback.type === 'success' ? '#10b981' : '#06b6d4'
              }}>
                {uploadFeedback.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Griglia Principale: Catalogo Barche & Simulatore Live */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* SEZIONE 1: Flotta Barche a Catalogo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="#06b6d4" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Schede Barche Attive ({boats.length})
              </h3>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.3rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Upload size={14} /> + Aggiungi PDF
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Caricamento schede barche in corso...
            </div>
          ) : boats.length === 0 ? (
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px dashed var(--border-color)',
              borderRadius: '16px',
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.8rem'
            }}>
              <Anchor size={40} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Nessuna scheda barca caricata</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '350px' }}>
                Carica il tuo primo PDF oppure sincronizza la cartella Google Drive per attivare le risposte e l&apos;invio allegati dell&apos;assistente AI.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: '0.5rem',
                  background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem 1.4rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Carica Primo PDF
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {boats.map(boat => (
                <div
                  key={boat.id}
                  style={{
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    padding: '1.1rem',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    transition: 'all 0.2s',
                    opacity: boat.isActive ? 1 : 0.6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {boat.title}
                        </span>
                        {boat.year && (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.5rem',
                            borderRadius: '6px'
                          }}>
                            {boat.year}
                          </span>
                        )}
                        {boat.price && (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.5rem',
                            borderRadius: '6px'
                          }}>
                            {boat.price}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {boat.manufacturer ? `Cantiere: ${boat.manufacturer}` : ''} 
                        {boat.length ? ` • Lungh: ${boat.length}m` : ''} 
                        {boat.cabins ? ` • Cabine: ${boat.cabins}` : ''} 
                        {boat.baths ? ` • Bagni: ${boat.baths}` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button
                        onClick={() => handleToggleBoatActive(boat)}
                        title={boat.isActive ? 'Disattiva da WhatsApp' : 'Attiva su WhatsApp'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: boat.isActive ? '#10b981' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.5rem'
                        }}
                      >
                        {boat.isActive ? '🟢 Attiva' : '⚪ Disattiva'}
                      </button>
                      <button
                        onClick={() => setEditingBoat({ ...boat })}
                        title="Modifica scheda"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          padding: '0.3rem'
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteBoat(boat.id, boat.title)}
                        title="Elimina barca"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          padding: '0.3rem'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {boat.engines && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      ⚙️ <b>Motori:</b> {boat.engines}
                    </div>
                  )}

                  {boat.features && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                      ✨ <b>Punti di forza:</b> {boat.features}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      📄 {boat.fileName} {boat.fileSize ? `(${(boat.fileSize / 1024 / 1024).toFixed(1)} MB)` : ''}
                    </span>
                    <a
                      href={`/api/boats/download/${boat.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.75rem',
                        color: '#06b6d4',
                        textDecoration: 'none',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Download size={13} /> Scarica PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEZIONE 2: Simulatore WhatsApp (Demo per Cliente) */}
        <div style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.3rem',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          height: '650px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Simulatore WhatsApp Live</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Testa l&apos;AI prima o durante il test reale su WhatsApp
                </span>
              </div>
            </div>
            <button
              onClick={() => setSimulatorMessages([
                {
                  id: 'welcome',
                  sender: 'ai',
                  text: '⚓ Ciao Alessandro! Chiedimi qualsiasi informazione sulle barche o chiedimi di inviarti la scheda tecnica in allegato!',
                  timestamp: '10:00'
                }
              ])}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Azzera Chat
            </button>
          </div>

          {/* Quick Prompt Pill Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
            <button
              onClick={() => handleSendSimulation('Quali barche avete disponibili?')}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '15px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.7rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🛥️ Quali barche ci sono?
            </button>
            <button
              onClick={() => handleSendSimulation('Avete barche con almeno 3 cabine?')}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '15px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.7rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🛏️ Barche con 3 cabine
            </button>
            <button
              onClick={() => {
                const firstBoat = boats[0]?.title || 'Oceanis';
                handleSendSimulation(`Mi invii in allegato la scheda tecnica di ${firstBoat}?`);
              }}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '15px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.7rem',
                color: '#06b6d4',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: 600
              }}
            >
              📎 Richiedi Scheda in Allegato
            </button>
          </div>

          {/* Finestra Messaggi Chat */}
          <div
            ref={chatScrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              padding: '0.5rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '12px'
            }}
          >
            {simulatorMessages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{
                  background: msg.sender === 'user' ? '#075e54' : '#1f2c34',
                  color: '#fff',
                  padding: '0.7rem 0.9rem',
                  borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '0.3rem' }}>
                    {msg.timestamp} {msg.sender === 'user' && '✓✓'}
                  </div>
                </div>

                {/* Box Allegato Documento WhatsApp simulato */}
                {msg.attachment && (
                  <div style={{
                    background: '#128c7e',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    padding: '0.7rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.8rem',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        background: '#fff',
                        borderRadius: '6px',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FileText size={20} color="#075e54" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>
                          {msg.attachment.fileName}
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                          Documento PDF • Scheda Tecnica
                        </div>
                      </div>
                    </div>
                    <a
                      href={msg.attachment.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        color: '#fff',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Download size={13} /> Apri
                    </a>
                  </div>
                )}
              </div>
            ))}

            {isSimulating && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#1f2c34',
                color: '#06b6d4',
                padding: '0.5rem 0.9rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Sparkles size={14} className="animate-spin" />
                L&apos;IA sta analizzando le schede e componendo la risposta...
              </div>
            )}
          </div>

          {/* Input Chat */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
            <input
              type="text"
              value={simulatorInput}
              onChange={e => setSimulatorInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendSimulation()}
              placeholder="Scrivi un messaggio o chiedi una scheda..."
              disabled={isSimulating}
              style={{
                flex: 1,
                padding: '0.6rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
            <button
              onClick={() => handleSendSimulation()}
              disabled={isSimulating || !simulatorInput.trim()}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modale Modifica Scheda Barca */}
      {editingBoat && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Modifica Specifiche Scheda Barca</h3>
              <button onClick={() => setEditingBoat(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateBoatDetails} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Titolo Scheda:</label>
                <input
                  type="text"
                  value={editingBoat.title || ''}
                  onChange={e => setEditingBoat({ ...editingBoat, title: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Modello:</label>
                  <input
                    type="text"
                    value={editingBoat.model || ''}
                    onChange={e => setEditingBoat({ ...editingBoat, model: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cantiere:</label>
                  <input
                    type="text"
                    value={editingBoat.manufacturer || ''}
                    onChange={e => setEditingBoat({ ...editingBoat, manufacturer: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Anno:</label>
                  <input
                    type="number"
                    value={editingBoat.year || ''}
                    onChange={e => setEditingBoat({ ...editingBoat, year: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Lunghezza (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingBoat.length || ''}
                    onChange={e => setEditingBoat({ ...editingBoat, length: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Prezzo:</label>
                  <input
                    type="text"
                    value={editingBoat.price || ''}
                    onChange={e => setEditingBoat({ ...editingBoat, price: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cabine:</label>
                  <input
                    type="number"
                    value={editingBoat.cabins ?? ''}
                    onChange={e => setEditingBoat({ ...editingBoat, cabins: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Bagni:</label>
                  <input
                    type="number"
                    value={editingBoat.baths ?? ''}
                    onChange={e => setEditingBoat({ ...editingBoat, baths: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Motori:</label>
                <input
                  type="text"
                  value={editingBoat.engines || ''}
                  onChange={e => setEditingBoat({ ...editingBoat, engines: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Punti di Forza:</label>
                <input
                  type="text"
                  value={editingBoat.features || ''}
                  onChange={e => setEditingBoat({ ...editingBoat, features: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Descrizione:</label>
                <textarea
                  rows={3}
                  value={editingBoat.description || ''}
                  onChange={e => setEditingBoat({ ...editingBoat, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingBoat(null)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', color: '#fff', border: 'none', padding: '0.5rem 1.2rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
