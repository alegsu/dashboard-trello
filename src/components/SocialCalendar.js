import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Loader, Trash2 } from 'lucide-react';
import SocialPostModal from './SocialPostModal';

const typeColors = {
  post: '#3b82f6',
  reel: '#e83e8c',
  video: '#f59e0b',
  stories: '#10b981'
};

export default function SocialCalendar({ clients, users = [] }) {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [filterClient, setFilterClient] = useState('');
  const [filterUser, setFilterUser] = useState('');
  
  const [selectedPost, setSelectedPost] = useState(null);

  // Generate days based on view mode
  const days = useMemo(() => {
    const list = [];
    const date = new Date(currentDate);
    date.setHours(0,0,0,0);

    if (viewMode === 'weekly') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(date.setDate(diff));
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        list.push(d);
      }
    } else {
      const y = date.getFullYear();
      const m = date.getMonth();
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0);
      
      const startDay = startOfMonth.getDay();
      let padDays = startDay === 0 ? 6 : startDay - 1;
      for (let i = padDays; i > 0; i--) {
        const d = new Date(startOfMonth);
        d.setDate(d.getDate() - i);
        list.push(d);
      }
      for (let i = 1; i <= endOfMonth.getDate(); i++) {
        list.push(new Date(y, m, i));
      }
      const endDay = endOfMonth.getDay();
      let padEnd = endDay === 0 ? 0 : 7 - endDay;
      for (let i = 1; i <= padEnd; i++) {
        const d = new Date(endOfMonth);
        d.setDate(d.getDate() + i);
        list.push(d);
      }
    }
    return list;
  }, [currentDate, viewMode]);

  // Fetch posts when days change
  useEffect(() => {
    if (days.length === 0) return;
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const start = days[0].toISOString();
        const end = days[days.length - 1].toISOString();
        const res = await fetch(`/api/social-posts?start=${start}&end=${end}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    fetchPosts();
  }, [days]);

  // Navigate dates
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleGenerate = async () => {
    if (!confirm(`Vuoi generare automaticamente i post previsti dai piani editoriali per il mese di ${monthNames[currentDate.getMonth()]}?`)) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: currentDate.getFullYear(),
          month: currentDate.getMonth()
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Generati ${data.generatedCount} post con successo!`);
        // Trigger re-fetch
        setCurrentDate(new Date(currentDate)); 
      }
    } catch(err) {
      console.error(err);
      alert('Errore durante la generazione');
    }
    setIsGenerating(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Sei sicuro di voler ELIMINARE TUTTI I POST del mese di ${monthNames[currentDate.getMonth()]}? Questa azione non può essere annullata.`)) return;
    setIsGenerating(true); // Using same loading state
    try {
      const res = await fetch(`/api/social-posts?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Eliminati ${data.deletedCount} post con successo.`);
        setCurrentDate(new Date(currentDate)); // Trigger re-fetch
      }
    } catch(err) {
      console.error(err);
      alert('Errore durante l\'eliminazione');
    }
    setIsGenerating(false);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, post) => {
    e.dataTransfer.setData('postId', post.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, date) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData('postId');
    if (!postId) return;

    // Ottimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, date: date.toISOString() };
      }
      return p;
    }));

    try {
      await fetch(`/api/social-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: date.toISOString() })
      });
    } catch (err) {
      console.error('Error updating post date', err);
    }
  };

  const handleUpdatePost = (updatedPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handleDeletePost = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setSelectedPost(null);
  };

  const getDayContents = (date) => {
    let dayPosts = posts.filter(p => new Date(p.date).toDateString() === date.toDateString());
    if (filterClient) {
      dayPosts = dayPosts.filter(p => p.clientId === filterClient);
    }
    if (filterUser) {
      dayPosts = dayPosts.filter(p => p.assignees?.some(a => a.id === filterUser));
    }
    return dayPosts;
  };

  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const dayNames = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={20} /> Calendario Social</h2>
          
          <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setViewMode('weekly')} 
              style={{ padding: '0.4rem 1rem', background: viewMode === 'weekly' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'weekly' ? 'black' : 'var(--text-primary)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Settimana
            </button>
            <button 
              onClick={() => setViewMode('monthly')} 
              style={{ padding: '0.4rem 1rem', background: viewMode === 'monthly' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'monthly' ? 'black' : 'var(--text-primary)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Mese
            </button>
          </div>

          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem' }}>
            <option value="">Tutti i clienti</option>
            {clients.filter(c => c.status === 'CLIENTE').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem' }}>
            <option value="">Tutti gli utenti</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleGenerate} disabled={isGenerating} style={{ padding: '0.4rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isGenerating ? <Loader size={14} className="spin" /> : '✨ Genera mese'}
            </button>
            <button onClick={handleBulkDelete} disabled={isGenerating} title="Svuota mese" style={{ padding: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isGenerating ? <Loader size={14} className="spin" /> : <Trash2 size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0, minWidth: '150px', textAlign: 'center' }}>
            {viewMode === 'weekly' 
              ? `${days[0].getDate()} ${monthNames[days[0].getMonth()]} - ${days[6].getDate()} ${monthNames[days[6].getMonth()]}`
              : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            }
          </h3>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handlePrev} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.3rem', cursor: 'pointer', color: 'var(--text-primary)' }}><ChevronLeft size={16} /></button>
            <button onClick={handleToday} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.3rem 0.8rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 'bold' }}>Oggi</button>
            <button onClick={handleNext} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.3rem', cursor: 'pointer', color: 'var(--text-primary)' }}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', position: 'relative' }}>
        {isLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <Loader size={30} className="spin" />
          </div>
        )}
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '0.5rem', 
          height: viewMode === 'weekly' ? '100%' : 'auto',
          minHeight: viewMode === 'monthly' ? '600px' : 'auto'
        }}>
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: '0.5rem', background: 'var(--bg-glass)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {d}
            </div>
          ))}

          {days.map((date, index) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const contents = getDayContents(date);

            return (
              <div 
                key={index}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
                style={{ 
                  background: isToday ? 'var(--bg-elevated)' : 'var(--bg-glass)', 
                  border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  opacity: (viewMode === 'monthly' && !isCurrentMonth) ? 0.4 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: viewMode === 'weekly' ? '200px' : '100px',
                  transition: 'background 0.2s'
                }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{date.getDate()}</span>
                  {viewMode === 'monthly' && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{dayNames[date.getDay()]}</span>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, overflowY: 'auto' }}>
                  {contents.map((item, i) => {
                    const isApproval = item.status === 'APPROVAL';
                    const isScheduled = item.status === 'SCHEDULED';
                    const isSkipped = item.status === 'SKIPPED';
                    
                    let bgColor = 'rgba(0,0,0,0.2)';
                    if (isSkipped) bgColor = 'rgba(249, 115, 22, 0.15)';
                    
                    let borderStyle = `none`;
                    let borderLeftStyle = `4px solid ${item.client?.color || 'white'}`;
                    
                    if (isScheduled) {
                      borderStyle = `1px solid #10b981`;
                    }
                    
                    return (
                      <div 
                        key={item.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => setSelectedPost(item)}
                        className={isApproval ? 'pulse-purple' : ''}
                        style={{ 
                          background: bgColor, 
                          border: borderStyle,
                          borderLeft: isScheduled ? `4px solid #10b981` : borderLeftStyle,
                          padding: '0.4rem', 
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          opacity: isSkipped ? 0.6 : 1
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: item.client?.color || 'var(--text-primary)', textDecoration: isSkipped ? 'line-through' : 'none' }}>{item.client?.name}</span>
                          <span style={{ color: typeColors[item.type] || 'white', textTransform: 'capitalize', fontSize: '0.7rem' }}>{item.type}</span>
                        </div>
                      
                      {item.assignees && item.assignees.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                          {item.assignees.map(a => (
                            <div key={a.id} title={a.name} style={{ width: '18px', height: '18px', borderRadius: '50%', background: a.color || '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 'bold', color: 'white' }}>
                              {a.name.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {selectedPost && (
        <SocialPostModal 
          post={selectedPost} 
          onClose={() => setSelectedPost(null)}
          onUpdate={handleUpdatePost}
          onDelete={handleDeletePost}
        />
      )}
    </div>
  );
}
