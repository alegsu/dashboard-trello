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
import { Search, Filter, Tag, Folder, Building, Bell } from 'lucide-react';

export default function DashboardClient({ initialBoards, initialLists, initialCards, initialMembers, initialClients }) {
  const router = useRouter();
  // Se non c'è una board, mostra settings. Altrimenti kanban.
  const [view, setView] = useState(initialBoards.length > 0 ? 'kanban' : 'settings'); 
  const [selectedBoardId, setSelectedBoardId] = useState(initialBoards.length > 0 ? initialBoards[0].id : '');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [zenMode, setZenMode] = useState(false);
  
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

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => { if(Array.isArray(data)) setAllProjects(data) });
    if (selectedBoardId) {
      fetch(`/api/labels?boardId=${selectedBoardId}`).then(r => r.json()).then(data => { if(Array.isArray(data)) setAllLabels(data) });
    }
  }, [selectedBoardId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    
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
      <header className={`glass-panel ${styles.header}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 className="text-gradient" style={{ margin: 0 }}><span style={{ color: 'var(--accent-primary)' }}>Gestion</span>Ale</h1>
            <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              v1.1.1
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setZenMode(!zenMode)}
              style={{ background: zenMode ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: zenMode ? 'white' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', transition: 'all 0.3s' }}
            >
              {zenMode ? '🧘‍♂️ Esci da Zen' : '🧘‍♂️ Zen Mode'}
            </button>
            {zenMode && (
               <div style={{ background: 'rgba(0,0,0,0.1)', padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                 ⏱️ Focus
               </div>
            )}
            
            {initialBoards.length > 0 && !zenMode && (
              <select 
                value={selectedBoardId} 
                onChange={(e) => setSelectedBoardId(e.target.value)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 'bold' }}
              >
                {initialBoards.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            {!zenMode && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Liste: {boardLists.length} | Task: {boardCards.length}
              </div>
            )}
          </div>
        </div>

        {view !== 'settings' && !zenMode && (
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', padding: '0 0.5rem', borderRadius: '6px', flex: 1, border: '1px solid var(--border-color)' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input 
                type="text" 
                placeholder="Cerca task..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '0.5rem', width: '100%', outline: 'none', color: 'var(--text-primary)' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Filter size={18} color="var(--text-secondary)" />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Building size={14} color="var(--text-secondary)" />
                <select 
                  value={filterClientId} 
                  onChange={e => setFilterClientId(e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Tutti i Clienti</option>
                  {(initialClients || [])
                    .filter(c => liveCards.some(card => card.clientId === c.id && !card.isArchived && !card.list?.isArchived))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Folder size={14} color="var(--text-secondary)" />
                <select 
                  value={filterProjectId} 
                  onChange={e => setFilterProjectId(e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Tutti i Progetti</option>
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Tag size={14} color="var(--text-secondary)" />
                <select 
                  value={filterLabelId} 
                  onChange={e => setFilterLabelId(e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Tutte le Etichette</option>
                  {allLabels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <select 
                value={filterUserId} 
                onChange={e => setFilterUserId(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                <option value="">Tutti gli Utenti</option>
                <option value="unassigned">Non Assegnati</option>
                {initialMembers.map(m => {
                  // Calculate workload: incomplete cards assigned to this member
                  const assignedCards = initialCards.filter(c => c.assignees && c.assignees.some(a => a.id === m.id));
                  let workloadEmoji = '🟢';
                  if (assignedCards.length >= 5 && assignedCards.length <= 10) workloadEmoji = '🟡';
                  if (assignedCards.length > 10) workloadEmoji = '🔴';
                  
                  return (
                    <option key={m.id} value={m.id}>
                      {workloadEmoji} {m.name} ({assignedCards.length})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}
        
        {!zenMode && (
          <div className={styles.navBar} style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              className={`${styles.navButton} ${view === 'kanban' ? styles.active : ''}`}
              onClick={() => setView('kanban')}
              disabled={initialBoards.length === 0}
            >
              📋 Kanban
            </button>
            <button 
              className={`${styles.navButton} ${view === 'timeline' ? styles.active : ''}`}
              onClick={() => setView('timeline')}
              disabled={initialBoards.length === 0}
            >
              📊 Timeline
            </button>
            <button 
              className={`${styles.navButton} ${view === 'projects' ? styles.active : ''}`}
              onClick={() => setView('projects')}
            >
              🏢 Progetti
            </button>
            <button 
              className={`${styles.navButton} ${view === 'clients' ? styles.active : ''}`}
              onClick={() => setView('clients')}
            >
              👥 Clienti e Rubrica
            </button>
            <button 
              className={`${styles.navButton} ${view === 'settings' ? styles.active : ''}`}
              onClick={() => setView('settings')}
            >
              ⚙️ Impostazioni
            </button>
            <a href="/archive" className={styles.navButton} style={{ textDecoration: 'none' }}>
              🗄️ Archivio
            </a>

            <div style={{ position: 'relative', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => setShowNotificationsModal(!showNotificationsModal)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', padding: '0.5rem' }}
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--status-danger)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
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
                        <div 
                          key={n.id} 
                          onClick={() => markNotificationAsRead(n.id, n.link)}
                          style={{ padding: '0.8rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(var(--accent-rgb), 0.1)' }}
                        >
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
            />
          )}
          {view === 'timeline' && selectedBoardId && (
            <TimelineView 
              lists={boardLists} 
              cards={boardCards} 
              members={initialMembers} 
            />
          )}
          {view === 'projects' && (
            <ProjectsView 
              clients={initialClients || []} 
              onRefresh={handleRefresh} 
            />
          )}
          {view === 'clients' && (
            <ClientsView clients={initialClients} cards={liveCards} onRefresh={handleRefresh} />
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
    </main>
  );
}
