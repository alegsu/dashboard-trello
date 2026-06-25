"use client";
import React from 'react';
import styles from './KanbanView.module.css';

export default function KanbanView({ lists, cards, members }) {
  // Organize cards by member and list
  const memberMap = new Map(members.map(m => [m.id, m]));
  
  // Create a row for "Unassigned" tasks
  const unassignedId = 'unassigned';
  const allUserIds = [unassignedId, ...members.map(m => m.id)];

  const cardsByCell = {}; // key format: `${userId}-${listId}`

  cards.forEach(card => {
    const listId = card.idList;
    if (!card.idMembers || card.idMembers.length === 0) {
      const key = `${unassignedId}-${listId}`;
      if (!cardsByCell[key]) cardsByCell[key] = [];
      cardsByCell[key].push(card);
    } else {
      card.idMembers.forEach(mId => {
        const key = `${mId}-${listId}`;
        if (!cardsByCell[key]) cardsByCell[key] = [];
        cardsByCell[key].push(card);
      });
    }
  });

  return (
    <div className={styles.kanbanContainer}>
       {/* Header row: lists (Clients) */}
       <div className={styles.kanbanHeaderRow}>
          <div className={styles.kanbanUserCorner}>Utente \ Cliente</div>
          {lists.map(list => (
            <div key={list.id} className={styles.kanbanColumnHeader}>
              {list.name}
            </div>
          ))}
       </div>

       {/* Body: Swimlanes per User */}
       <div className={styles.kanbanBody}>
          {allUserIds.map(userId => {
            const user = userId === unassignedId ? { name: 'Non Assegnato' } : memberMap.get(userId);
            
            // Verifica se questo utente ha almeno una card, altrimenti lo nascondiamo
            // per evitare righe vuote e pulire la vista (opzionale, ma consigliato)
            let hasCards = false;
            for(const list of lists) {
                if(cardsByCell[`${userId}-${list.id}`]) {
                    hasCards = true;
                    break;
                }
            }
            if(!hasCards && userId !== unassignedId) return null;

            return (
              <div key={userId} className={styles.kanbanSwimlane}>
                <div className={styles.kanbanUserHeader}>
                   {user.name}
                </div>
                <div className={styles.kanbanSwimlaneCells}>
                  {lists.map(list => {
                    const cellKey = `${userId}-${list.id}`;
                    const cellCards = cardsByCell[cellKey] || [];
                    return (
                      <div key={cellKey} className={styles.kanbanCell}>
                        {cellCards.map(card => (
                          <div key={card.id} className={styles.kanbanCard}>
                            <div className={styles.kanbanCardName}>{card.name}</div>
                            {card.due && (
                                <div className={styles.kanbanCardDue}>
                                    📅 {new Date(card.due).toLocaleDateString('it-IT')}
                                </div>
                            )}
                            {card.labels && card.labels.length > 0 && (
                                <div className={styles.kanbanLabels}>
                                    {card.labels.map(lbl => (
                                        <span key={lbl.id} className={styles.label} style={{backgroundColor: lbl.color || '#3b82f6'}}>{lbl.name}</span>
                                    ))}
                                </div>
                            )}
                          </div>
                        ))}
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
