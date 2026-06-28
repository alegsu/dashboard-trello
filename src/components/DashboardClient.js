"use client";
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/page.module.css';
import KanbanView from './KanbanView';
import TimelineView from './TimelineView';
import SettingsPanel from './SettingsPanel';
import ProjectsView from './ProjectsView';
import ClientsView from './ClientsView';
import PomodoroTimer from './PomodoroTimer';
import HelpModal from './HelpModal';
import MyTasksView from './MyTasksView';
import DocumentImportModal from './DocumentImportModal';
import CardModal from './CardModal';
import { Layout, Columns, Search, Filter, Tag, User, Folder, Target, Zap, Activity, Grid, List as ListIcon, Building, ShieldCheck, Edit2, Bell, HelpCircle, Clock } from 'lucide-react';

export default function DashboardClient({ initialBoards, initialLists, initialCards, initialMembers, initialClients }) {
  const router = useRouter();
  // Se non c'è una board, mostra settings. Altrimenti kanban.
  const [view, setView] = useState(initialBoards.length > 0 ? 'kanban' : 'settings'); 
  const [selectedBoardId, setSelectedBoardId] = useState(initialBoards.length > 0 ? initialBoards[0].id : '');
  
  useEffect(() => {
    if (typeof window !== 'undefined' && initialBoards.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlBoardId = urlParams.get('boardId');
      const saved = localStorage.getItem('lastSelectedBoardId');
      
      if (urlBoardId && initialBoards.find(b => b.id === urlBoardId)) {
        setSelectedBoardId(urlBoardId);
        localStorage.setItem('lastSelectedBoardId', urlBoardId);
        // Ripulisci URL per pulizia (opzionale, ma evitiamo refresh strani)
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (saved && initialBoards.find(b => b.id === saved)) {
        setSelectedBoardId(saved);
      } else {
        setSelectedBoardId(initialBoards[0].id);
      }

      const cardId = urlParams.get('card');
      if (cardId) {
        setGlobalCardId(cardId);
        const url = new URL(window.location.href);
        url.searchParams.delete('card');
        window.history.replaceState({}, document.title, url);
      }
    }
  }, [initialBoards]);

  useEffect(() => {
    if (selectedBoardId && typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedBoardId', selectedBoardId);
    }
  }, [selectedBoardId]);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [zenMode, setZenMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(null);
  const [globalCardId, setGlobalCardId] = useState(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterLabelId, setFilterLabelId] = useState('');

  const [allProjects, setAllProjects] = useState([]);
  const [allLabels, setAllLabels] = useState([]);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Help Modal
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => { if(Array.isArray(data)) setAllProjects(data) });
    if (selectedBoardId) {
      fetch(`/api/labels?boardId=${selectedBoardId}`).then(r => r.json()).then(data => { if(Array.isArray(data)) setAllLabels(data) });
    }
  }, [selectedBoardId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
      fetch('/api/cron/process-queue?force=true').catch(() => {});
    }, 60000);
    
    // Auth and Tracking
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      const userObj = initialMembers.find(m => m.id === storedUserId);
      setCurrentUser(userObj);
      
      if (userObj?.theme) {
        document.documentElement.setAttribute('data-theme', userObj.theme);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      
      // Tracking ping
      const trackInterval = setInterval(() => {
        fetch('/api/auth/track', { method: 'POST', body: JSON.stringify({ userId: storedUserId }) }).catch(() => {});
      }, 60000);
      return () => {
        clearInterval(interval);
        clearInterval(trackInterval);
      };
    } else {
      router.push('/login');
    }

    return () => clearInterval(interval);
  }, [initialMembers, router]);

  const fetchNotifications = async () => {
    const res = await fetch(`/api/notifications`);
    if (res.ok) {
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    }
  };

  const markNotificationAsRead = async (id, link) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    fetchNotifications();
    if (link) window.location.href = link;
  };

  const markAllAsRead = async () => {
    await fetch(`/api/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true })
    });
    fetchNotifications();
  };

  const [liveCards, setLiveCards] = useState(initialCards);
  useEffect(() => {
    setLiveCards(initialCards);
  }, [initialCards]);

  // Filtriamo Liste e Cards per la board selezionata
  const boardLists = useMemo(() => initialLists.filter(l => l.boardId === selectedBoardId), [initialLists, selectedBoardId]);
  
  const boardCards = useMemo(() => {
    let cards = liveCards.filter(c => c.boardId === selectedBoardId);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)));
    }
    
    if (filterUserId) {
      if (filterUserId === 'unassigned') {
         cards = cards.filter(c => !c.assignees || c.assignees.length === 0);
      } else {
         cards = cards.filter(c => c.assignees && c.assignees.some(a => a.id === filterUserId));
      }
    }

    if (filterClientId) {
      cards = cards.filter(c => c.clientId === filterClientId);
    }
    
    if (filterProjectId) {
      cards = cards.filter(c => c.projectId === filterProjectId);
    }

    if (filterLabelId) {
      cards = cards.filter(c => c.labels && c.labels.some(l => l.id === filterLabelId));
    }
    
    return cards;
  }, [liveCards, selectedBoardId, searchQuery, filterUserId, filterClientId, filterProjectId, filterLabelId]);

  const handleRefresh = () => {
    router.refresh(); 
  };

  const handleCardUpdate = (updatedCard) => {
    setLiveCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
  };

  return (
    <main className={styles.mainContainer}>
      <header className={`glass-panel ${styles.header}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem', padding: '1rem 1.5rem', borderTop: '3px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/logo.png" alt="ShinyUp Logo" style={{ height: '32px', objectFit: 'contain' }} />
              <h1 className="text-gradient" style={{ margin: 0, textShadow: '0 0 20px rgba(161, 189, 207, 0.2)' }}><span style={{ color: 'var(--accent-primary)' }}>Gestion</span>Ale</h1>
            </div>
            <span style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', boxShadow: '0 0 10px rgba(161, 189, 207, 0.4)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              v2.9.0
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setIsHelpOpen(true)}
              style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.3s' }}
              title="Guida e Automazioni"
            >
              <HelpCircle size={20} />
            </button>
            <button 
              onClick={() => setView(view === 'my-tasks' ? 'kanban' : 'my-tasks')}
              style={{ background: view === 'my-tasks' ? 'var(--status-success)' : 'rgba(161, 189, 207, 0.05)', color: view === 'my-tasks' ? 'white' : 'var(--text-primary)', border: view === 'my-tasks' ? '1px solid var(--status-success)' : '1px solid var(--border-color)', borderRadius: '20px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', transition: 'all 0.3s' }}
            >
              🎯 La Mia Giornata
            </button>
            <button 
              onClick={() => setZenMode(!zenMode)}
              style={{ background: zenMode ? 'var(--accent-primary)' : 'rgba(161, 189, 207, 0.05)', color: zenMode ? 'white' : 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '20px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', transition: 'all 0.3s', boxShadow: zenMode ? '0 0 15px rgba(161, 189, 207, 0.5)' : 'none' }}
            >
              {zenMode ? '🧘‍♂️ Esci da Zen' : '🧘‍♂️ Zen Mode'}
            </button>
            
            {!zenMode && view === 'kanban' && (
              <button 
                onClick={() => setShowImportModal(true)}
                style={{ background: 'var(--status-success)', color: 'white', border: 'none', borderRadius: '20px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', transition: 'all 0.3s' }}
                title="Crea Bacheca da Documento AI"
              >
                ✨ Importa Documento
              </button>
            )}
            {zenMode && (
               <div style={{ background: 'rgba(0,0,0,0.1)', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                 ⏱️ Focus
               </div>
            )}
            
            {initialBoards.length > 0 && !zenMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select 
                  value={selectedBoardId} 
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 'bold' }}
                >
                  {initialBoards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button 
                  onClick={async () => {
                    const board = initialBoards.find(b => b.id === selectedBoardId);
                    if (!board) return;
                    const newName = prompt('Nuovo nome bacheca:', board.name);
                    if (newName && newName.trim() !== '' && newName !== board.name) {
                      await fetch(`/api/boards/${selectedBoardId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName.trim() })
                      });
                      window.location.reload(); // Refresh veloce per aggiornare la UI
                    }
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  title="Rinomina Bacheca"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            {currentTime && (
              <div style={{ color: 'var(--text-secondary)', marginLeft: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', lineHeight: '1.2' }}>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '0.75rem' }}>
                  {currentTime.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        </div>

        {!zenMode && (
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-glass)', padding: '0.4rem', borderRadius: '8px', flexWrap: 'nowrap', overflowX: 'auto', alignItems: 'center', border: '1px solid var(--border-color)', backdropFilter: 'blur(12px)' }}>
            
            {view !== 'settings' && (<>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', padding: '0 0.4rem', borderRadius: '20px', border: '1px solid var(--border-color)', transition: 'width 0.3s ease', width: searchQuery ? '150px' : '32px', overflow: 'hidden' }}>
              <Search size={14} color="var(--text-secondary)" style={{ minWidth: '14px', cursor: 'pointer' }} onClick={(e) => { e.target.nextSibling?.focus(); }} />
              <input 
                type="text" 
                placeholder="Cerca..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={(e) => e.target.parentElement.style.width = '150px'}
                onBlur={(e) => { if (!searchQuery) e.target.parentElement.style.width = '32px' }}
                style={{ border: 'none', background: 'transparent', padding: '0.3rem', width: '100%', outline: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', marginLeft: '0.3rem' }}
              />
            </div>
            
            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Filter size={14} color="var(--text-secondary)" />
              
              <select 
                value={filterClientId} 
                onChange={e => {
                  const cid = e.target.value;
                  setFilterClientId(cid);
                  if (cid) {
                    const client = initialClients.find(c => c.id === cid);
                    if (client) {
                      const board = initialBoards.find(b => b.name.toLowerCase().includes(client.name.toLowerCase()));
                      if (board) setSelectedBoardId(board.id);
                    }
                  }
                }}
                style={{ padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              >
                <option value="">Tutti i Clienti</option>
                {(initialClients || []).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select 
                value={filterProjectId} 
                onChange={e => setFilterProjectId(e.target.value)}
                style={{ padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              >
                <option value="">Tutti i Progetti</option>
                {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <select 
                value={filterLabelId} 
                onChange={e => setFilterLabelId(e.target.value)}
                style={{ padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              >
                <option value="">Tutte le Etichette</option>
                {allLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <select 
                value={filterUserId} 
                onChange={e => setFilterUserId(e.target.value)}
                style={{ padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              >
                <option value="">Tutti gli Utenti</option>
                <option value="unassigned">Non Assegnati</option>
                {initialMembers.map(m => {
                  const assignedCards = initialCards.filter(c => c.assignees && c.assignees.some(a => a.id === m.id));
                  let workloadEmoji = '🟢';
                  if (assignedCards.length >= 5 && assignedCards.length <= 10) workloadEmoji = '🟡';
                  if (assignedCards.length > 10) workloadEmoji = '🔴';
                  return <option key={m.id} value={m.id}>{workloadEmoji} {m.name} ({assignedCards.length})</option>;
                })}
              </select>
            </div>
            </>)}

            <div style={{ flex: 1 }}></div>

            {/* Nav Tabs merged into the same row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button className={`${styles.navButton} ${view === 'kanban' ? styles.active : ''}`} onClick={() => setView('kanban')} disabled={initialBoards.length === 0} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>📋 Kanban</button>
              <button className={`${styles.navButton} ${view === 'timeline' ? styles.active : ''}`} onClick={() => setView('timeline')} disabled={initialBoards.length === 0} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>📊 Timeline</button>
              <button className={`${styles.navButton} ${view === 'projects' ? styles.active : ''}`} onClick={() => setView('projects')} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>🏢 Progetti</button>
              <button className={`${styles.navButton} ${view === 'clients' ? styles.active : ''}`} onClick={() => setView('clients')} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>👥 Clienti</button>
              <button className={`${styles.navButton} ${view === 'settings' ? styles.active : ''}`} onClick={() => setView('settings')} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>⚙️ Imposta</button>
              <a href="/archive" className={styles.navButton} style={{ textDecoration: 'none', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>🗄️ Arch.</a>
              
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
                <button onClick={() => setShowNotificationsModal(!showNotificationsModal)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', padding: '0.2rem' }}>
                  <Bell size={16} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--status-danger)', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                {showNotificationsModal && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, width: '300px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000, overflow: 'hidden' }}>
                    <div style={{ padding: '0.8rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>Notifiche</h4>
                      <button onClick={markAllAsRead} style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}>Letto tutto</button>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nessuna notifica.</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} onClick={() => markNotificationAsRead(n.id, n.link)} style={{ padding: '0.8rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(var(--accent-rgb), 0.1)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{n.message}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{new Date(n.createdAt).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
      
      <div className={styles.content}>
        <section className={`glass-panel ${styles.viewArea}`} style={{ padding: view === 'settings' ? '1rem' : 0 }}>
          {view === 'kanban' && (
            <KanbanView 
              boardId={selectedBoardId} 
              lists={boardLists} 
              cards={boardCards} 
              members={initialMembers} 
              clients={initialClients || []}
              onRefresh={handleRefresh} 
              onCardUpdate={handleCardUpdate}
              currentUser={currentUser}
              zenMode={zenMode}
              filterClientId={filterClientId}
              onCardClick={setGlobalCardId}
            />
          )}
          {view === 'timeline' && selectedBoardId && (
            <TimelineView 
              lists={boardLists} 
              cards={boardCards} 
              members={initialMembers} 
              onCardClick={setGlobalCardId}
            />
          )}
          {view === 'projects' && (
            <ProjectsView 
              clients={initialClients || []} 
              members={initialMembers || []}
              currentUser={currentUser}
              onRefresh={handleRefresh} 
              onNavigateToBoard={(boardId) => {
                setView('kanban');
                setSelectedBoardId(boardId);
              }}
              onCardClick={setGlobalCardId}
            />
          )}
          {view === 'clients' && (
            <ClientsView clients={initialClients} cards={liveCards} onRefresh={handleRefresh} />
          )}
          {view === 'my-tasks' && (
            <MyTasksView 
              cards={liveCards} 
              currentUser={currentUser} 
              clients={initialClients || []} 
              boards={initialBoards} 
              allMembers={initialMembers}
              lists={initialLists || []}
              onCardUpdate={handleCardUpdate} 
              onRefresh={handleRefresh}
              onCardClick={setGlobalCardId}
            />
          )}
          {view === 'settings' && (
            <SettingsPanel 
              members={initialMembers} 
              boards={initialBoards} 
              clients={initialClients || []} 
              currentUser={currentUser}
              lists={initialLists || []}
              onRefresh={handleRefresh}
            />
          )}
          {initialBoards.length === 0 && view !== 'settings' && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Nessuna bacheca creata. Vai in Impostazioni per crearne una.
            </div>
          )}
        </section>
      </div>
      
      {zenMode && <PomodoroTimer />}
      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
      {showImportModal && (
        <DocumentImportModal 
          onClose={() => setShowImportModal(false)} 
          onRefresh={() => window.location.reload()}
          boardLists={boardLists}
          selectedBoardId={selectedBoardId}
        />
      )}
      {globalCardId && (
        <CardModal 
          cardId={globalCardId} 
          members={initialMembers} 
          currentUser={currentUser}
          onRefresh={handleRefresh}
          onClose={() => {
            setGlobalCardId(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('card');
            window.history.replaceState({}, '', url);
          }} 
        />
      )}
    </main>
  );
}
