import React from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import CardModal from './CardModal';

export default function MyTasksView({ cards, currentUser, clients, boards, allMembers, onCardUpdate }) {
  const [selectedCard, setSelectedCard] = React.useState(null);

  if (!currentUser) return <div>Caricamento...</div>;

  // Filtra solo i task assegnati all'utente corrente e non in liste "Fatto"
  const myCards = cards.filter(c => 
    c.assignees?.some(a => a.id === currentUser.id) &&
    !c.list?.name.toLowerCase().includes('fatto') &&
    !c.list?.name.toLowerCase().includes('completat')
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue = [];
  const todayOrTomorrow = [];
  const upcoming = [];
  const noDate = [];

  myCards.forEach(c => {
    if (!c.dueDate) {
      noDate.push(c);
      return;
    }
    const due = new Date(c.dueDate);
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
  overdue.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  todayOrTomorrow.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const renderCardList = (list, title, icon, color) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color, borderBottom: `2px solid ${color}`, paddingBottom: '0.5rem' }}>
          {icon} {title} <span style={{ background: color, color: 'white', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', marginLeft: 'auto' }}>{list.length}</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {list.map(card => {
            const clientName = card.project?.client?.name || 'Progetto Interno';
            return (
              <div 
                key={card.id} 
                onClick={() => setSelectedCard(card)}
                style={{ 
                  background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', 
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' 
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {clientName} • {card.list?.name}
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{card.name}</strong>
                  {card.dueDate && (
                    <div style={{ fontSize: '0.85rem', color: color === 'var(--text-secondary)' ? 'var(--text-primary)' : color, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={14} /> {new Date(card.dueDate).toLocaleDateString('it-IT')}
                    </div>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCard(card);
                  }}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
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

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={(updatedCard) => {
            onCardUpdate(updatedCard);
            setSelectedCard(updatedCard); // Aggiorna in locale la view modale
          }}
          boards={boards}
          currentUser={currentUser}
          boardMembers={allMembers}
        />
      )}
    </div>
  );
}
