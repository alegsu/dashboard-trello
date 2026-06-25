"use client";

import { useState } from 'react';
import styles from '@/app/page.module.css';
import KanbanView from './KanbanView';
import TimelineView from './TimelineView';

export default function DashboardClient({ initialLists, initialCards, initialMembers }) {
  const [view, setView] = useState('kanban'); // 'kanban' or 'timeline'

  return (
    <main className={styles.mainContainer}>
      <header className={`glass-panel ${styles.header}`}>
        <h1 className="text-gradient">Resource Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)' }}>
          <p>Clienti (Liste): {initialLists.length}</p>
          <p>Tasks (Cards): {initialCards.length}</p>
          <p>Utenti: {initialMembers.length}</p>
        </div>
      </header>
      
      <div className={styles.content}>
        <aside className={`glass-panel ${styles.sidebar}`}>
          <nav>
            <ul>
              <li 
                onClick={() => setView('timeline')}
                style={{ background: view === 'timeline' ? 'var(--bg-secondary)' : 'transparent', color: view === 'timeline' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                Timeline
              </li>
              <li 
                onClick={() => setView('kanban')}
                style={{ background: view === 'kanban' ? 'var(--bg-secondary)' : 'transparent', color: view === 'kanban' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                Kanban
              </li>
            </ul>
          </nav>
        </aside>
        
        <section className={`glass-panel ${styles.viewArea}`} style={{ padding: 0 }}>
          {view === 'kanban' ? (
            <KanbanView lists={initialLists} cards={initialCards} members={initialMembers} />
          ) : (
            <TimelineView lists={initialLists} cards={initialCards} members={initialMembers} />
          )}
        </section>
      </div>
    </main>
  );
}
