"use client";
import React, { useMemo } from 'react';
import styles from './TimelineView.module.css';

export default function TimelineView({ cards, members, lists }) {
  // 1. Definiamo l'intervallo di date (es. da -7 giorni a +21 giorni)
  const { dateColumns, todayTime } = useMemo(() => {
    const cols = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayMs = today.getTime();
    
    for (let i = -7; i <= 21; i++) {
      const d = new Date(todayMs);
      d.setDate(today.getDate() + i);
      cols.push(d);
    }
    return { dateColumns: cols, todayTime: todayMs };
  }, []);

  // Helper per formattare la data come YYYY-MM-DD
  const getFormatDate = (dateObj) => {
      return `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
  };

  // 2. Mappiamo le card per utente e per data di scadenza
  const cardsByCell = {}; // chiave: `${userId}-${dateString}`
  const unassignedId = 'unassigned';
  const allUserIds = [unassignedId, ...members.map(m => m.id)];
  const memberMap = new Map(members.map(m => [m.id, m]));

  cards.forEach(card => {
    if (!card.due) return; // Nella timeline mostriamo solo i task con una data di scadenza
    
    const dueDate = new Date(card.due);
    const dateStr = getFormatDate(dueDate);

    if (!card.assignees || card.assignees.length === 0) {
      const key = `${unassignedId}-${dateStr}`;
      if(!cardsByCell[key]) cardsByCell[key] = [];
      cardsByCell[key].push(card);
    } else {
      card.assignees.forEach(a => {
        const key = `${a.id}-${dateStr}`;
        if(!cardsByCell[key]) cardsByCell[key] = [];
        cardsByCell[key].push(card);
      });
    }
  });

  return (
    <div className={styles.timelineContainer}>
      {/* Header riga: Date */}
      <div className={styles.timelineHeaderRow}>
         <div className={styles.timelineUserCorner}>Utente \ Data Scadenza</div>
         {dateColumns.map(d => {
            const isToday = d.getTime() === todayTime;
            return (
              <div key={d.toISOString()} className={`${styles.timelineDateHeader} ${isToday ? styles.today : ''}`}>
                 <div className={styles.dayName}>{d.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                 <div className={styles.dayNumber}>{d.getDate()} {d.toLocaleDateString('it-IT', { month: 'short' })}</div>
              </div>
            )
         })}
      </div>

      {/* Body: Righe per Utente */}
      <div className={styles.timelineBody}>
         {allUserIds.map(userId => {
            const user = userId === unassignedId ? { name: 'Non Assegnato' } : memberMap.get(userId);
            
            return (
              <div key={userId} className={styles.timelineRow}>
                 <div className={styles.timelineUserHeader}>
                    {user.name}
                 </div>
                 <div className={styles.timelineCells}>
                    {dateColumns.map(d => {
                       const dateStr = getFormatDate(d);
                       const key = `${userId}-${dateStr}`;
                       const cellCards = cardsByCell[key] || [];
                       const isToday = d.getTime() === todayTime;

                       return (
                         <div key={key} className={`${styles.timelineCell} ${isToday ? styles.todayCell : ''}`}>
                            {cellCards.map(card => {
                               const list = lists.find(l => l.id === card.idList); // Il Cliente
                               return (
                                 <div key={card.id} className={styles.timelineCard} title={list?.name}>
                                    <div className={styles.cardName}>{card.name}</div>
                                    {list && <div className={styles.cardClient}>{list.name}</div>}
                                 </div>
                               )
                            })}
                         </div>
                       )
                    })}
                 </div>
              </div>
            )
         })}
      </div>
    </div>
  );
}
