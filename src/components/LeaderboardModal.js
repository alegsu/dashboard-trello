"use client";
import React, { useState, useEffect } from 'react';
import { X, Trophy, Medal, Star } from 'lucide-react';

export default function LeaderboardModal({ onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort by cardsDone descending
          const sorted = data.sort((a, b) => {
            const aCards = a._count?.cardsDone || 0;
            const bCards = b._count?.cardsDone || 0;
            if (bCards !== aCards) return bCards - aCards;
            
            const aTasks = a._count?.checklistItemsDone || 0;
            const bTasks = b._count?.checklistItemsDone || 0;
            return bTasks - aTasks;
          });
          setMembers(sorted);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', zIndex: 999999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div 
        style={{
          background: 'var(--bg-primary)',
          width: '90%', maxWidth: '500px', maxHeight: '80vh',
          borderRadius: '16px', border: '1px solid var(--accent-primary)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ background: 'var(--bg-elevated)', padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
            <Trophy size={24} color="#fbbf24" /> Classifica Team
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento classifica...</div>
          ) : (
            members.map((m, i) => {
              let badge = null;
              if (i === 0) badge = <span style={{ fontSize: '1.5rem' }}>🥇</span>;
              else if (i === 1) badge = <span style={{ fontSize: '1.5rem' }}>🥈</span>;
              else if (i === 2) badge = <span style={{ fontSize: '1.5rem' }}>🥉</span>;
              else badge = <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', width: '24px', textAlign: 'center', display: 'inline-block' }}>#{i + 1}</span>;

              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: 'var(--bg-glass)', padding: '1rem',
                  borderRadius: '12px', border: i === 0 ? '2px solid #fbbf24' : '1px solid var(--border-color)',
                  boxShadow: i === 0 ? '0 0 15px rgba(251, 191, 36, 0.2)' : 'none'
                }}>
                  {badge}
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {(m.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: i === 0 ? '#fbbf24' : 'var(--text-primary)' }}>
                      {m.name} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        {(() => {
                          const hasActivity = (m._count?.cardsDone || 0) > 0 || (m._count?.checklistItemsDone || 0) > 0;
                          if (!hasActivity) return '💤 In panchina';
                          if (i === 0) return '👑 Dominatore';
                          if (i === 1) return '🚀 Macchina';
                          if (i === 2) return '⚡ Scheggia';
                          return '💪 Al lavoro';
                        })()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <span><strong>{m._count?.cardsDone || 0}</strong> Schede Chiuse</span>
                      <span><strong>{m._count?.checklistItemsDone || 0}</strong> Task</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {m.avgCardHours ? (
                      <div>Tempo completamento:<br/><strong style={{color: '#38bdf8'}}>{m.avgCardHours >= 24 ? (m.avgCardHours / 24).toFixed(1) + ' giorni / scheda' : m.avgCardHours + ' ore / scheda'}</strong></div>
                    ) : '-'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
