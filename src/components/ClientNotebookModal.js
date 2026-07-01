import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Bot, X, Trash2 } from 'lucide-react';

export default function ClientNotebookModal({ client, onClose }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [chatting, setChatting] = useState(false);
  const chatEndRef = useRef(null);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/clients/${client.id}/knowledge`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [client.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSavingNote(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote, source: 'MANUAL' })
      });
      const data = await res.json();
      if (data.success) {
        setNotes([data.note, ...notes]);
        setNewNote('');
      } else {
        alert(data.error || 'Errore salvataggio nota');
      }
    } catch (err) {
      alert('Errore di rete');
    }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa nota? Verrà rimossa anche dalla conoscenza dell'IA.")) return;

    try {
      const res = await fetch(`/api/clients/${client.id}/knowledge/${noteId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setNotes(notes.filter(n => n.id !== noteId));
      } else {
        alert(data.error || 'Errore eliminazione nota');
      }
    } catch (err) {
      alert('Errore di rete');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatting) return;

    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setChatting(true);

    try {
      const res = await fetch(`/api/clients/${client.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'system', content: data.error || 'Errore nella generazione della risposta.' }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'system', content: 'Errore di rete.' }]);
    }
    setChatting(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem' }}>
      <div style={{ background: 'var(--bg-primary)', width: '100%', maxWidth: '1200px', height: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        
        {/* Header Modale */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🧠</span>
            <h2 style={{ margin: 0 }}>Brain: {client.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* Corpo Modale */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Lato Sinistro: Fonti e Note */}
          <div style={{ flex: '0 0 350px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(161, 189, 207, 0.02)' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> Fonti Conoscenza</h4>
              
              <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <textarea 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Incolla appunti, testo di un meeting o info sul cliente..."
                  rows={4}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'none' }}
                />
                <button type="submit" disabled={savingNote || !newNote.trim()} style={{ padding: '0.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  {savingNote ? 'Salvataggio in OpenAI...' : 'Aggiungi alla Knowledge Base'}
                </button>
              </form>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <h5 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Note Archiviate ({notes.length})</h5>
              {loadingNotes && <p style={{ fontSize: '0.8rem' }}>Caricamento note...</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {notes.map(note => (
                  <div key={note.id} style={{ padding: '0.8rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', position: 'relative', paddingRight: '2rem' }}>
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', padding: '0.2rem' }}
                      title="Elimina nota"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      <span>{note.source === 'EMAIL' ? '📧 Da Email' : '📝 Manuale'}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>
                      {note.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lato Destro: Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {chatHistory.length === 0 && (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                  <Bot size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <h3>Chiedimi tutto su {client.name}</h3>
                  <p style={{ fontSize: '0.9rem' }}>L&apos;assistente leggerà solo le note archiviate a sinistra. Nessuna ricerca su internet, niente allucinazioni.</p>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <div key={i} style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: msg.role === 'user' ? 'var(--accent-primary)' : (msg.role === 'system' ? 'var(--status-danger)' : 'var(--bg-elevated)'),
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                  padding: '1rem',
                  borderRadius: '12px',
                  borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                  borderBottomLeftRadius: msg.role !== 'user' ? '2px' : '12px',
                  lineHeight: '1.5'
                }}>
                  {msg.role === 'assistant' && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--accent-primary)' }}><Bot size={14} /> AI</div>}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))}
              {chatting && (
                <div style={{ alignSelf: 'flex-start', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '12px', borderBottomLeftRadius: '2px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bot size={16} className="fa-spin" /> <span>Consulto la knowledge base...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  placeholder="Es: Riassumimi l'ultima call di aggiornamento..."
                  style={{ flex: 1, padding: '0.8rem', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  disabled={chatting}
                />
                <button type="submit" disabled={chatting || !chatMessage.trim()} style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
