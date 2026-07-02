import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const itDaysMap = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  0: 'sunday'
};

const typeColors = {
  post: '#3b82f6',
  reel: '#e83e8c',
  video: '#f59e0b',
  stories: '#10b981'
};

export default function SocialCalendar({ clients }) {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Parse all clients' social plans
  const socialClients = useMemo(() => {
    return clients
      .filter(c => c.socialPlan && c.status === 'CLIENTE')
      .map(c => {
        try {
          return { ...c, plan: JSON.parse(c.socialPlan) };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }, [clients]);

  // Navigate dates
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate days based on view mode
  const days = useMemo(() => {
    const list = [];
    const date = new Date(currentDate);
    date.setHours(0,0,0,0);

    if (viewMode === 'weekly') {
      // Find Monday
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(date.setDate(diff));
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        list.push(d);
      }
    } else {
      // Find start of month
      const y = date.getFullYear();
      const m = date.getMonth();
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0);
      
      // Pad beginning to start on Monday
      const startDay = startOfMonth.getDay();
      let padDays = startDay === 0 ? 6 : startDay - 1;
      
      for (let i = padDays; i > 0; i--) {
        const d = new Date(startOfMonth);
        d.setDate(d.getDate() - i);
        list.push(d);
      }
      
      // Month days
      for (let i = 1; i <= endOfMonth.getDate(); i++) {
        list.push(new Date(y, m, i));
      }
      
      // Pad end to complete week
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

  const monthNames = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const dayNames = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

  const getDayContents = (date) => {
    const dayOfWeek = date.getDay();
    const dayKey = itDaysMap[dayOfWeek];
    
    const contents = [];
    socialClients.forEach(client => {
      const dayPlan = client.plan[dayKey];
      if (dayPlan) {
        ['post', 'reel', 'video', 'stories'].forEach(type => {
          if (dayPlan[type] > 0) {
            contents.push({
              clientName: client.name,
              color: client.color || '#333',
              type,
              count: dayPlan[type]
            });
          }
        });
      }
    });
    return contents;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '0.5rem', 
          height: viewMode === 'weekly' ? '100%' : 'auto',
          minHeight: viewMode === 'monthly' ? '600px' : 'auto'
        }}>
          {/* Header Giorni della settimana */}
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: '0.5rem', background: 'var(--bg-glass)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {d}
            </div>
          ))}

          {/* Celle Calendario */}
          {days.map((date, index) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const contents = getDayContents(date);

            return (
              <div key={index} style={{ 
                background: isToday ? 'var(--bg-elevated)' : 'var(--bg-glass)', 
                border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.5rem',
                opacity: (viewMode === 'monthly' && !isCurrentMonth) ? 0.4 : 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: viewMode === 'weekly' ? '200px' : '100px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{date.getDate()}</span>
                  {viewMode === 'monthly' && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{dayNames[date.getDay()]}</span>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, overflowY: 'auto' }}>
                  {contents.map((item, i) => (
                    <div key={i} style={{ 
                      background: 'rgba(0,0,0,0.2)', 
                      borderLeft: `4px solid ${item.color || 'white'}`,
                      padding: '0.3rem', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <span style={{ fontWeight: 'bold', color: item.color || 'var(--text-primary)' }}>{item.clientName}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                        <span style={{ color: typeColors[item.type] || 'white', textTransform: 'capitalize' }}>{item.type}</span>
                        <span style={{ background: 'var(--bg-primary)', padding: '0.1rem 0.3rem', borderRadius: '10px', fontWeight: 'bold' }}>x{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
