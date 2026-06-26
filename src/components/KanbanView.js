"use client";
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CardModal from './CardModal';
import styles from './KanbanView.module.css';

export default function KanbanView({ boardId, lists, cards, members, clients, onRefresh, onCardUpdate }) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);

  useEffect(() => { setIsMounted(true); }, []);
  
  const [newListMode, setNewListMode] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  const [newCardCell, setNewCardCell] = useState(null); // { clientId, listId }
  const [newCardName, setNewCardName] = useState('');
  
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingListStartDate, setEditingListStartDate] = useState('');
  const [editingListEndDate, setEditingListEndDate] = useState('');

  // Raggruppiamo i clienti per id per facilitare la ricerca
  const clientMap = new Map((clients || []).map(c => [c.id, c]));
  const unassignedId = 'unassigned';
  const allClientIds = [unassignedId, ...(clients || []).map(c => c.id)];

  const [localCards, setLocalCards] = useState(cards);
  useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  const cardsByCell = {};

  localCards.forEach(card => {
    const listId = card.listId;
    const clientId = card.clientId || unassignedId;
    const key = `${clientId}-${listId}`;
    if (!cardsByCell[key]) cardsByCell[key] = [];
    cardsByCell[key].push(card);
  });

  // Sort each cell's cards by their order so optimistic UI drops them exactly where they belong
  Object.values(cardsByCell).forEach(arr => {
    arr.sort((a, b) => a.order - b.order);
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const sourceCell = result.source.droppableId;
    const destCell = result.destination.droppableId;

    const sourceParts = sourceCell.split('-');
    const destParts = destCell.split('-');
    const sourceClientId = sourceParts[0];
    const destClientId = destParts[0];

    // Se stiamo cercando di cambiare cliente spostando la riga, blocchiamo
    if (sourceClientId !== destClientId) return;

    const cardId = result.draggableId;
    
    const destListId = destParts[1];
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceCell === destCell && sourceIndex === destIndex) return;

    // Calcoliamo il nuovo order
    let cellCards = Array.from(cardsByCell[destCell] || []);
    if (sourceCell === destCell) {
      // Rimuoviamo l'elemento dalla sua vecchia posizione per calcolare correttamente i vicini
      const [removed] = cellCards.splice(sourceIndex, 1);
    }
    
    let newOrder = 0;
    if (cellCards.length === 0) {
      newOrder = 1000;
    } else if (destIndex === 0) {
      newOrder = cellCards[0].order - 1000;
    } else if (destIndex >= cellCards.length) {
      newOrder = cellCards[cellCards.length - 1].order + 1000;
    } else {
      newOrder = (cellCards[destIndex - 1].order + cellCards[destIndex].order) / 2.0;
    }
    
    // Aggiornamento ottimistico dell'interfaccia (elimina i glitch/scatti)
    const updatedCards = [...localCards];
    const targetCardIdx = updatedCards.findIndex(c => c.id === cardId);
    let optimisticCard = null;
    if (targetCardIdx !== -1) {
      optimisticCard = { ...updatedCards[targetCardIdx], listId: destListId, order: newOrder };
      updatedCards[targetCardIdx] = optimisticCard;
      setLocalCards(updatedCards);
    }

    // API Call
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: destListId, order: newOrder })
    });
    
    // Non chiamiamo onRefresh qui per non fare bounce back, 
    // l'aggiornamento è già salvato nello stato liveCards di DashboardClient.
  };

  const handleAddList = async () => {
    if (!newListName.trim()) {
      setNewListMode(false);
      return;
    }
    await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName, boardId, order: lists.length })
    });
    setNewListName('');
    setNewListMode(false);
    onRefresh();
  };

  const startEditingList = (list) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
    setEditingListStartDate(list.startDate ? new Date(list.startDate).toISOString().split('T')[0] : '');
    setEditingListEndDate(list.endDate ? new Date(list.endDate).toISOString().split('T')[0] : '');
  };

  const saveEditingList = async (listId) => {
    if (!editingListName.trim()) {
      setEditingListId(null);
      return;
    }
    await fetch(`/api/lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: editingListName,
        startDate: editingListStartDate ? new Date(editingListStartDate).toISOString() : null,
        endDate: editingListEndDate ? new Date(editingListEndDate).toISOString() : null
      })
    });
    setEditingListId(null);
    onRefresh();
  };

  const archiveList = async (listId) => {
    if (window.confirm("Sei sicuro di voler archiviare questa lista? Potrai ripristinarla dalle impostazioni.")) {
      await fetch(`/api/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      });
      setEditingListId(null);
      onRefresh();
    }
  };

  const handleAddCard = async (clientId, listId) => {
    if (!newCardName.trim()) {
      setNewCardCell(null);
      return;
    }
    const bodyData = { name: newCardName, boardId, listId, order: 0 };
    if (clientId !== unassignedId) {
      bodyData.clientId = clientId;
    }

    await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    setNewCardName('');
    setNewCardCell(null);
    onRefresh();
  };

  const setCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    const friday = new Date(today.setDate(diffToMonday + 4));
    
    setEditingListStartDate(monday.toISOString().split('T')[0]);
    setEditingListEndDate(friday.toISOString().split('T')[0]);
  };

  if (!isMounted) return null;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={styles.kanbanContainer}>
         <div className={styles.kanbanHeaderRow}>
            <div className={styles.kanbanUserCorner}>Utente \ Stato</div>
            {lists.map(list => {
              const hasDates = list.startDate || list.endDate;
              return (
                <div key={list.id} className={styles.kanbanColumnHeader}>
                  {editingListId === list.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                      <input 
                        autoFocus 
                        value={editingListName} 
                        onChange={e => setEditingListName(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && saveEditingList(list.id)} 
                        style={{ width: '90%', padding: '0.2rem', textAlign: 'center', fontFamily: 'var(--font-title)', fontWeight: 'bold' }} 
                      />
                      <div style={{ display: 'flex', gap: '0.2rem', fontSize: '0.8rem' }}>
                        <input type="date" value={editingListStartDate} onChange={e => setEditingListStartDate(e.target.value)} style={{ padding: '0.1rem', fontSize: '0.7rem', flex: 1 }} title="Inizio Sprint" />
                        <span>-</span>
                        <input type="date" value={editingListEndDate} onChange={e => setEditingListEndDate(e.target.value)} style={{ padding: '0.1rem', fontSize: '0.7rem', flex: 1 }} title="Fine Sprint" />
                      </div>
                      <button onClick={setCurrentWeek} style={{ fontSize: '0.7rem', background: 'var(--bg-glass)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer', width: '100%' }}>
                        📅 Settimana Corrente (Lun-Ven)
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', width: '100%' }}>
                        <button onClick={() => saveEditingList(list.id)} style={{ flex: 1, background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}>Salva</button>
                        <button onClick={() => archiveList(list.id)} style={{ flex: 1, background: 'var(--status-warning)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}>Archivia</button>
                        <button onClick={() => setEditingListId(null)} style={{ flex: 1, background: 'var(--status-danger)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}>Annulla</button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => startEditingList(list)} 
                      style={{ cursor: 'pointer' }}
                      title="Clicca per modificare nome o date"
                    >
                      <div>{list.name}</div>
                      {hasDates && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'normal', marginTop: '0.2rem', fontFamily: 'var(--font-base)' }}>
                          {list.startDate ? new Date(list.startDate).toLocaleDateString('it-IT') : '...'} - {list.endDate ? new Date(list.endDate).toLocaleDateString('it-IT') : '...'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {newListMode && (
              <div className={styles.kanbanColumnHeader} style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', minWidth: '180px', flex: '0 0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input autoFocus value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddList()} placeholder="Nome Lista..." style={{ width: '100%', padding: '0.4rem' }} />
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button onClick={handleAddList} style={{ flex: 1, background: 'var(--status-success)', color: 'white', border: 'none', padding: '0.2rem', borderRadius: '4px', cursor: 'pointer' }}>Salva</button>
                    <button onClick={() => setNewListMode(false)} style={{ flex: 1, background: 'var(--status-danger)', color: 'white', border: 'none', padding: '0.2rem', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                  </div>
                </div>
              </div>
            )}
            
            {!newListMode && (
              <div style={{ minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.5rem' }}>
                <button 
                  onClick={() => setNewListMode(true)} 
                  title="Nuova Lista"
                  style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}
                >
                  +
                </button>
              </div>
            )}
         </div>

         <div className={styles.kanbanBody}>
            {allClientIds.map(clientId => {
              const client = clientId === unassignedId ? { name: 'Nessun Cliente' } : clientMap.get(clientId);
              return (
                <div key={clientId} className={styles.kanbanSwimlane}>
                  <div className={styles.kanbanUserHeader}>
                     {client?.name}
                  </div>
                  <div className={styles.kanbanSwimlaneCells}>
                    {lists.map(list => {
                      const cellKey = `${clientId}-${list.id}`;
                      const cellCards = cardsByCell[cellKey] || [];
                      return (
                        <Droppable key={cellKey} droppableId={cellKey} type={clientId}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef} 
                              {...provided.droppableProps}
                              className={`${styles.kanbanCell} ${snapshot.isDraggingOver ? styles.dragOver : ''}`}
                            >
                              {cellCards.map((card, index) => (
                                <Draggable key={card.id} draggableId={card.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`${styles.kanbanCard} ${snapshot.isDragging ? styles.dragging : ''}`}
                                      onClick={() => setSelectedCardId(card.id)}
                                      style={{ ...provided.draggableProps.style, background: card.color || 'var(--bg-secondary)' }}
                                    >
                                      {card.labels && card.labels.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                          {card.labels.map(l => (
                                            <span key={l.id} style={{ background: l.color, width: '24px', height: '6px', borderRadius: '3px' }} title={l.name}></span>
                                          ))}
                                        </div>
                                      )}
                                      <div className={styles.kanbanCardName}>{card.name}</div>
                                      {card.due && <div className={styles.kanbanCardDue}>📅 {new Date(card.due).toLocaleDateString('it-IT')}</div>}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              
                              {newCardCell === cellKey ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.3rem' }}>
                                  <input autoFocus value={newCardName} onChange={e => setNewCardName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCard(clientId, list.id)} placeholder="Nome Task..." style={{ padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem' }} />
                                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button onClick={() => handleAddCard(clientId, list.id)} style={{ padding: '0.2rem 0.4rem', cursor: 'pointer', fontSize: '0.75rem', background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '4px' }}>Salva</button>
                                    <button onClick={() => setNewCardCell(null)} style={{ padding: '0.2rem 0.4rem', cursor: 'pointer', fontSize: '0.75rem', background: 'var(--status-danger)', color: 'white', border: 'none', borderRadius: '4px' }}>X</button>
                                  </div>
                                </div>
                              ) : (
                                <div className={styles.addCardBtn} onClick={() => setNewCardCell(cellKey)} title="Aggiungi Task">+</div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      )
                    })}
                    {newListMode && <div className={styles.kanbanCell} style={{ background: 'transparent', border: 'none', minWidth: '180px', flex: '0 0 auto' }}></div>}
                    {!newListMode && <div style={{ minWidth: '40px' }}></div>}
                  </div>
                </div>
              )
            })}
         </div>
      </div>

      {selectedCardId && (
        <CardModal 
          cardId={selectedCardId} 
          members={members} 
          onClose={() => setSelectedCardId(null)} 
          onRefresh={onRefresh} 
        />
      )}
    </DragDropContext>
  );
}
