import React, { useState, useEffect } from 'react';
import { X, Send, Calendar, Clock, Trash2, Edit2, MessageSquare, Tag, AlignLeft } from 'lucide-react';

export default function SocialPostModal({ post, onClose, onUpdate, onDelete, currentUser }) {
  const [status, setStatus] = useState(post.status || 'TODO');
  const [notes, setNotes] = useState(post.notes || '');
  const [type, setType] = useState(post.type || 'post');
  
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [isSaving, setIsSaving] = useState(false);

  // Sync internal state if post changes
  useEffect(() => {
    setStatus(post.status || 'TODO');
    setNotes(post.notes || '');
    setType(post.type || 'post');
    setComments(post.comments || []);
  }, [post]);

  const handleSave = async (updates) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/social-posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updatedPost = await res.json();
        onUpdate(updatedPost);
      }
    } catch (error) {
      console.error('Failed to update post', error);
    }
    setIsSaving(false);
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    handleSave({ status: newStatus });
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    handleSave({ type: newType });
  };

  const handleNotesBlur = () => {
    if (notes !== post.notes) {
      handleSave({ notes });
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText, socialPostId: post.id })
      });
      if (res.ok) {
        const newComment = await res.json();
        const newComments = [...comments, newComment];
        setComments(newComments);
        onUpdate({ ...post, comments: newComments });
        setCommentText('');
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo post?')) return;
    try {
      const res = await fetch(`/api/social-posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(post.id);
      }
    } catch (error) {
      console.error('Failed to delete', error);
    }
  };

  const statusColors = {
    'TODO': { bg: 'var(--bg-secondary)', text: 'var(--text-primary)', label: 'Da Fare' },
    'APPROVAL': { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa', label: 'In Approvazione', border: '#8b5cf6' },
    'SCHEDULED': { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', label: 'Programmato', border: '#10b981' },
    'SKIPPED': { bg: 'rgba(249, 115, 22, 0.2)', text: '#fb923c', label: 'Saltato', border: '#f97316' }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-primary)', width: '90%', maxWidth: '600px', maxHeight: '90vh',
        borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Tag size={20} color={post.client?.color || 'var(--accent-primary)'} />
              {post.client?.name}
            </h2>
            <select 
              value={type} 
              onChange={e => handleTypeChange(e.target.value)}
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderRadius: '4px', padding: '0.3rem', fontSize: '0.9rem' }}
            >
              <option value="post">Post</option>
              <option value="reel">Reel</option>
              <option value="video">Video</option>
              <option value="stories">Stories</option>
            </select>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Calendar size={16} /> <span>{new Date(post.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <select 
              value={status} 
              onChange={e => handleStatusChange(e.target.value)}
              style={{ 
                background: statusColors[status].bg, 
                color: statusColors[status].text, 
                border: `1px solid ${statusColors[status].border || 'var(--border-color)'}`, 
                borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.9rem', fontWeight: 'bold', outline: 'none', cursor: 'pointer' 
              }}
            >
              {Object.entries(statusColors).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <button onClick={handleDelete} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <Trash2 size={16} /> Elimina
            </button>
          </div>

          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}><AlignLeft size={18} /> Note / Copy</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Scrivi qui il copy del post, link a risorse, note..."
              style={{
                width: '100%', minHeight: '120px', background: 'var(--bg-glass)', color: 'var(--text-primary)',
                border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', resize: 'vertical',
                fontFamily: 'inherit', fontSize: '0.95rem'
              }}
            />
          </div>

          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}><MessageSquare size={18} /> Commenti</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>Nessun commento ancora.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: comment.author?.color || 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: 'black', flexShrink: 0 }}>
                      {comment.author?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg-glass)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{comment.author?.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(comment.createdAt).toLocaleString('it-IT')}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {comment.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Scrivi un commento..." 
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.6rem 1rem', color: 'var(--text-primary)' }}
              />
              <button 
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                style={{ background: 'var(--accent-primary)', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: commentText.trim() ? 'pointer' : 'not-allowed', opacity: commentText.trim() ? 1 : 0.5 }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
