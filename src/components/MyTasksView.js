import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, CheckSquare } from 'lucide-react';
export default function MyTasksView({ cards, currentUser, clients, boards, allMembers, onCardUpdate, lists, onRefresh, onCardClick }) {
  const [socialPosts, setSocialPosts] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    const end = new Date(Date.now() + 60 * 86400000).toISOString();
    fetch(`/api/social-posts?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const myPosts = data.filter(p => p.assignees?.some(a => a.id === currentUser.id));
          setSocialPosts(myPosts);
        }
      })
      .catch(err => console.error(err));
  }, [currentUser]);

  if (!currentUser) return <div>Caricamento...</div>;

  // Filtra solo i task assegnati all'utente corrente e non in liste "Fatto"
  const myCards = cards.filter(c => {
    const list = (lists || []).find(l => l.id === c.listId);
    const listName = list ? list.name.toLowerCase() : '';
    return c.assignees?.some(a => a.id === currentUser.id) &&
           !listName.includes('fatto') &&
           !listName.includes('completat');
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const mappedSocialPosts = socialPosts.map(sp => ({
    id: sp.id,
    name: `Pubblicazione Social: ${sp.type.toUpperCase()}`,
    due: sp.date,
    listId: 'social',
    isSocial: true,
    assignees: sp.assignees,
    client: sp.client,
  }));

  const allItems = [...myCards, ...mappedSocialPosts];

  const overdue = [];
  const todayOrTomorrow = [];
  const upcoming = [];
  const noDate = [];

  allItems.forEach(c => {
    if (!c.due) {
      noDate.push(c);
      return;
    }
    const due = new Date(c.due);
    due.setHours(0, 0, 0, 0);

    if (due < now) {
      overdue.push(c);
    } else if (due.getTime() === now.getTime() || due.getTime() === tomorrow.getTime()) {
      todayOrTomorrow.push(c);
    } else {
      upcoming.push(c);
    }
  });

  // Sort groups by due date
  overdue.sort((a, b) => new Date(a.due) - new Date(b.due));
  todayOrTomorrow.sort((a, b) => new Date(a.due) - new Date(b.due));
  upcoming.sort((a, b) => new Date(a.due) - new Date(b.due));

  const renderCardList = (list, title, icon, color) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color, borderBottom: `2px solid ${color}`, paddingBottom: '0.5rem' }}>
          {icon} {title} <span style={{ background: color, color: 'white', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', marginLeft: 'auto' }}>{list.length}</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {list.map(card => {
            const clientName = card.isSocial ? card.client?.name : (card.project?.client?.name || 'Progetto Interno');
            return (
              <div 
                key={card.id} 
                onClick={() => { if (!card.isSocial && onCardClick) onCardClick(card.id); }}
                style={{ 
                  background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', 
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' 
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {clientName} • {card.isSocial ? 'Calendario Social' : ((lists || []).find(l => l.id === card.listId)?.name || 'Lista')}
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{card.name}</strong>
                  {card.due && (
                    <div style={{ fontSize: '0.85rem', color: color === 'var(--text-secondary)' ? 'var(--text-primary)' : color, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={14} /> {new Date(card.due).toLocaleDateString('it-IT')}
                    </div>
                  )}
                  {(() => {
                    const totalItems = card.checklists?.reduce((sum, cl) => sum + (cl.items?.length || 0), 0) || 0;
                    const completedItems = card.checklists?.reduce((sum, cl) => sum + (cl.items?.filter(i => i.isCompleted)?.length || 0), 0) || 0;
                    if (totalItems === 0) return null;
                    
                    const percent = Math.round((completedItems / totalItems) * 100);
                    const isDone = completedItems === totalItems;
                    return (
                      <div style={{ marginTop: '0.5rem', width: '100%', maxWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                          <CheckSquare size={12} /> 
                          <span>{completedItems}/{totalItems} completati</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.max(3, percent)}%`, 
                            height: '100%', 
                            background: isDone ? 'var(--status-success)' : 'var(--accent-primary)', 
                            transition: 'width 0.3s' 
                          }}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!card.isSocial && onCardClick) onCardClick(card.id);
                  }}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: card.isSocial ? 'default' : 'pointer', color: 'var(--text-secondary)' }}
                >
                  <CheckCircle size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>La Mia Giornata</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Ecco le tue priorità, ordinate per scadenza. Concentrati su ciò che conta.</p>
      </div>

      {myCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <CheckCircle size={48} color="var(--status-success)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ margin: 0 }}>Tutto completato!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Non hai nessun task attivo assegnato a te al momento.</p>
        </div>
      ) : (
        <>
          {renderCardList(overdue, 'Scaduti', <AlertTriangle size={20} />, '#ef4444')}
          {renderCardList(todayOrTomorrow, 'Oggi / Domani', <Clock size={20} />, '#f59e0b')}
          {renderCardList(upcoming, 'Prossimi Giorni', <Calendar size={20} />, '#3b82f6')}
          {renderCardList(noDate, 'Senza Scadenza', <CheckCircle size={20} />, 'var(--text-secondary)')}
        </>
      )}
    </div>
  );
}
