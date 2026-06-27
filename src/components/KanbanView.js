"use client";
import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import confetti from 'canvas-confetti';
import CardModal from './CardModal';
import styles from './KanbanView.module.css';

// Helper per calcolare se il testo deve essere chiaro o scuro in base al background
function getContrastYIQ(hexcolor){
  if (!hexcolor) return 'var(--text-primary)';
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c+c).join('');
  if (hexcolor.length !== 6) return 'var(--text-primary)';
  var r = parseInt(hexcolor.substr(0,2),16);
  var g = parseInt(hexcolor.substr(2,2),16);
  var b = parseInt(hexcolor.substr(4,2),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

export default function KanbanView({ boardId, lists, cards, members, clients, onRefresh, onCardUpdate, currentUser, zenMode, filterClientId }) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => { 
    setIsMounted(true); 
    const savedZoom = localStorage.getItem('kanbanZoom');
    if (savedZoom) setZoomLevel(parseInt(savedZoom, 10));
  }, []);
  
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
    arr.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });
  });

  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dragSourceCell, setDragSourceCell] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // --- List Drag & Drop ---
  const [draggedListId, setDraggedListId] = useState(null);
  const [dragOverListId, setDragOverListId] = useState(null);

  const handleListDragStart = (e, list) => {
    setDraggedListId(list.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', list.id);
    // Needed to prevent card drop handlers from firing sometimes
    e.stopPropagation();
  };

  const handleListDragOver = (e, listId) => {
    e.preventDefault();
    if (draggedListId && draggedListId !== listId) {
      setDragOverListId(listId);
    }
  };

  const handleListDrop = async (e, destListId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverListId(null);
    if (!draggedListId || draggedListId === destListId) {
      setDraggedListId(null);
      return;
    }

    // Reorder logic
    const draggedListIndex = lists.findIndex(l => l.id === draggedListId);
    const destListIndex = lists.findIndex(l => l.id === destListId);
    
    if (draggedListIndex === -1 || destListIndex === -1) return;

    let newOrder = 0;
    if (destListIndex === 0 && draggedListIndex > 0) {
      newOrder = lists[0].order - 1000;
    } else if (destListIndex === lists.length - 1 && draggedListIndex < lists.length - 1) {
      newOrder = lists[lists.length - 1].order + 1000;
    } else {
      // Find the adjacent list to average with
      const beforeIndex = draggedListIndex < destListIndex ? destListIndex : destListIndex - 1;
      const afterIndex = draggedListIndex < destListIndex ? destListIndex + 1 : destListIndex;
      
      const beforeOrder = lists[beforeIndex]?.order ?? (lists[0].order - 1000);
      const afterOrder = lists[afterIndex]?.order ?? (lists[lists.length - 1].order + 1000);
      
      newOrder = (beforeOrder + afterOrder) / 2.0;
    }

    // Optimistic refresh logic could be complex here since `lists` is a prop, but we can call onRefresh
    await fetch(`/api/lists/${draggedListId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder })
    });
    setDraggedListId(null);
    onRefresh();
  };

  // --- Card Drag & Drop ---
  const [draggedCard, setDraggedCard] = useState(null); // { id, sourceCell, sourceIndex }

  const handleDragStart = (e, card, sourceCell, sourceIndex) => {
    setDraggedCard({ id: card.id, sourceCell, sourceIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    
    // Piccolo delay per permettere all'elemento di essere clonato visivamente dal browser prima di aggiungere l'opacità
    setTimeout(() => {
      if (e.target) e.target.classList.add(styles.draggingNative);
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove(styles.draggingNative);
    setDraggedCard(null);
    setDragOverCell(null);
  };

  const handleDragOverCell = (e, cellKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCell !== cellKey) {
      const parts = cellKey.split('-');
      // Impedisci il drag su clienti diversi
      if (draggedCard && draggedCard.sourceCell.split('-')[0] !== parts[0]) return;
      setDragOverCell(cellKey);
    }
  };

  const handleDragLeaveCell = (e, cellKey) => {
    if (dragOverCell === cellKey) setDragOverCell(null);
  };

  const handleDropOnCell = async (e, destCell) => {
    e.preventDefault();
    setDragOverCell(null);
    if (!draggedCard) return;

    // Se stiamo droppando direttamente sulla cella e non su una scheda specifica, lo mettiamo in fondo
    const cellCards = cardsByCell[destCell] || [];
    await performMove(draggedCard.id, draggedCard.sourceCell, draggedCard.sourceIndex, destCell, cellCards.length);
  };

  const handleDropOnCard = async (e, destCell, destIndex) => {
    e.preventDefault();
    e.stopPropagation(); // Evita che l'evento bubbling attivi l'handleDropOnCell
    setDragOverCell(null);
    if (!draggedCard) return;
    
    await performMove(draggedCard.id, draggedCard.sourceCell, draggedCard.sourceIndex, destCell, destIndex);
  };

  const performMove = async (cardId, sourceCell, sourceIndex, destCell, destIndex) => {
    if (sourceCell === destCell && sourceIndex === destIndex) return;
    
    const destParts = destCell.split('-');
    const destClientId = destParts[0];
    const destListId = destParts[1];
    
    const sourceParts = sourceCell.split('-');
    const sourceClientId = sourceParts[0];
    
    if (sourceClientId !== destClientId) return;

    let targetCards = Array.from(cardsByCell[destCell] || []).filter(c => c.id !== cardId);
    let newOrder = 0;
    if (targetCards.length === 0) {
      newOrder = 1000;
    } else if (destIndex === 0) {
      newOrder = targetCards[0].order - 1000;
    } else if (destIndex >= targetCards.length) {
      newOrder = targetCards[targetCards.length - 1].order + 1000;
    } else {
      newOrder = (targetCards[destIndex - 1].order + targetCards[destIndex].order) / 2.0;
    }

    const updatedCards = [...localCards];
    const targetCardIdx = updatedCards.findIndex(c => c.id === cardId);
    let optimisticCard = null;
    if (targetCardIdx !== -1) {
      optimisticCard = { ...updatedCards[targetCardIdx], listId: destListId, order: newOrder };
      updatedCards[targetCardIdx] = optimisticCard;
      flushSync(() => {
        setLocalCards(updatedCards);
      });
    }

    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: destListId, order: newOrder })
    });
    
    // Check if the destination list is a "done" list
    const destinationList = lists.find(l => l.id === destListId);
    if (destinationList) {
      const lowerName = destinationList.name.toLowerCase();
      if (lowerName.includes('fatto') || lowerName.includes('completat') || lowerName.includes('fine')) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          zIndex: 10000
        });
        
        // Push a notification
        if (currentUser) {
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id, // we might want to notify all admins or something, but for now we just show it to everyone locally or toast
              message: `Task completata da ${currentUser.name}! Ottimo lavoro!`,
              link: `/`
            })
          }).catch(()=>{});
        }
      }
    }
    
    if (onCardUpdate && optimisticCard) onCardUpdate(optimisticCard);
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
    if (currentUser) {
      bodyData.creatorId = currentUser.id;
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
      <div className={styles.kanbanContainer} style={{ zoom: zoomLevel / 100 }}>
         <div className={styles.kanbanHeaderRow}>
            <div className={styles.kanbanUserCorner}>Cliente | Stato</div>
            {lists.map(list => {
              const hasDates = list.startDate || list.endDate;
              return (
                <div 
                  key={list.id} 
                  className={styles.kanbanColumnHeader}
                  draggable={true}
                  onDragStart={(e) => handleListDragStart(e, list)}
                  onDragOver={(e) => handleListDragOver(e, list.id)}
                  onDrop={(e) => handleListDrop(e, list.id)}
                  style={{
                    borderLeft: dragOverListId === list.id ? '3px solid var(--accent-primary)' : undefined,
                    opacity: draggedListId === list.id ? 0.5 : 1
                  }}
                >
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
              <div style={{ width: '50px', flex: '0 0 50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            {allClientIds.filter(clientId => {
              const hasCards = lists.some(list => (cardsByCell[`${clientId}-${list.id}`] || []).length > 0);
              if (!hasCards && clientId !== filterClientId) {
                if (clientId === unassignedId && !filterClientId && Object.keys(cardsByCell).length === 0) {
                  return true;
                } else {
                  return false;
                }
              }
              return true;
            }).map((clientId, rowIndex) => {
              const client = clientId === unassignedId ? { name: 'Nessun Cliente' } : clientMap.get(clientId);
              let bgColor = rowIndex % 2 === 0 ? 'transparent' : 'rgba(161, 189, 207, 0.12)';
              if (client?.color) {
                const hex = client.color.replace('#', '');
                const r = parseInt(hex.substring(0,2), 16) || 30;
                const g = parseInt(hex.substring(2,4), 16) || 41;
                const b = parseInt(hex.substring(4,6), 16) || 59;
                bgColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
              }

              return (
                <div key={clientId} className={styles.kanbanSwimlane} style={{ background: bgColor }}>
                  <div className={styles.kanbanUserHeader} style={{ background: bgColor === 'transparent' ? 'var(--bg-primary)' : bgColor }}>
                     {client?.name}
                  </div>
                  <div className={styles.kanbanSwimlaneCells}>
                    {lists.map(list => {
                      const cellKey = `${clientId}-${list.id}`;
                      const cellCards = cardsByCell[cellKey] || [];
                      const isDoneList = list.name.toLowerCase().includes('fatto') || list.name.toLowerCase().includes('completat');
                      return (
                        <div 
                          key={cellKey}
                          className={`${styles.kanbanCell} ${dragOverCell === cellKey ? styles.dragOver : ''}`}
                          onDragOver={(e) => handleDragOverCell(e, cellKey)}
                          onDragLeave={(e) => handleDragLeaveCell(e, cellKey)}
                          onDrop={(e) => handleDropOnCell(e, cellKey)}
                        >
                          {cellCards.map((card, index) => {
                            const isDueApproaching = card.due && new Date(card.due) <= new Date(Date.now() + 24 * 60 * 60 * 1000);
                            return (
                              <div 
                                key={card.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, card, cellKey, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDropOnCard(e, cellKey, index)}
                                className={styles.kanbanCard}
                                onClick={() => setSelectedCardId(card.id)}
                                style={{ 
                                  background: card.color ? card.color : (bgColor === 'transparent' ? 'var(--bg-secondary)' : 'rgba(255, 255, 255, 0.3)'),
                                  color: getContrastYIQ(card.color || (bgColor === 'transparent' ? '#1e293b' : '#ffffff')),
                                  border: bgColor !== 'transparent' && !card.color ? '1px solid rgba(255,255,255,0.4)' : undefined
                                }}
                              >
                                {card.labels && card.labels.length > 0 && (
                                  <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                    {card.labels.map(l => (
                                      <span key={l.id} style={{ background: l.color, width: '24px', height: '6px', borderRadius: '3px' }} title={l.name}></span>
                                    ))}
                                  </div>
                                )}
                                <div className={styles.kanbanCardName} style={{ color: getContrastYIQ(card.color) }}>{card.name}</div>
                                {card.due && (
                                  <div 
                                    className={`${styles.kanbanCardDue} ${isDueApproaching && !isDoneList ? 'blink-red' : ''}`} 
                                    style={{ 
                                      color: isDueApproaching && !isDoneList ? 'white' : getContrastYIQ(card.color),
                                      background: isDueApproaching && !isDoneList ? 'var(--status-danger)' : 'transparent',
                                      padding: isDueApproaching && !isDoneList ? '0.1rem 0.4rem' : '0',
                                      borderRadius: '4px'
                                    }}
                                    title={isDueApproaching && !isDoneList ? "Attenzione: Scadenza imminente o superata e task non completato!" : ""}
                                  >
                                    📅 {new Date(card.due).toLocaleDateString('it-IT')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {(newCardCell?.listId === list.id && newCardCell?.clientId === clientId) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: 'auto' }}>
                              <input 
                                autoFocus 
                                value={newCardName} 
                                onChange={e => setNewCardName(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleAddCard(clientId, list.id)}
                                placeholder="Nome Scheda..." 
                                style={{ padding: '0.4rem' }} 
                              />
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button onClick={() => handleAddCard(clientId, list.id)} style={{ flex: 1, background: 'var(--status-success)', color: 'white', border: 'none', padding: '0.2rem', borderRadius: '4px', cursor: 'pointer' }}>Salva</button>
                                <button onClick={() => setNewCardCell(null)} style={{ flex: 1, background: 'var(--status-danger)', color: 'white', border: 'none', padding: '0.2rem', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.addCardBtn} onClick={() => setNewCardCell({ clientId, listId: list.id })} title="Aggiungi Task">+</div>
                          )}
                        </div>
                      )
                    })}
                    {newListMode && <div className={styles.kanbanCell} style={{ background: 'transparent', border: 'none', minWidth: '180px', flex: '0 0 auto' }}></div>}
                    <div style={{ width: '50px', flex: '0 0 50px' }}></div>
                  </div>
                </div>
              )
            })}
         </div>

      {selectedCardId && (
        <CardModal 
          cardId={selectedCardId} 
          members={members} 
          currentUser={currentUser}
          onClose={() => setSelectedCardId(null)} 
          onRefresh={onRefresh} 
        />
      )}
    </div>
  );
}
