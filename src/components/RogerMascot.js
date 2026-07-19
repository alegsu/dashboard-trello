"use client";
import React, { useState, useEffect } from 'react';

export default function RogerMascot({ currentUser, cards, setView }) {
  const [isVisible, setIsVisible] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (!currentUser || !cards) return;

    // Controllo Scadenze
    const myOverdueCount = cards.filter(c => {
      if (c.isArchived) return false;
      if (c.list && (c.list.name.toLowerCase().includes('fatto') || c.list.name.toLowerCase().includes('completat'))) return false;
      if (!c.assignees || !c.assignees.some(a => a.id === currentUser.id)) return false;
      if (c.due && new Date(c.due) < new Date()) return true;
      return false;
    }).length;

    if (myOverdueCount > 0) {
      setOverdueCount(myOverdueCount);
      
      const snoozeUntilStr = localStorage.getItem('rogerSnoozeUntil');
      if (snoozeUntilStr) {
        const snoozeUntil = new Date(snoozeUntilStr);
        if (new Date() < snoozeUntil) {
          // In snooze, non mostrare
          setIsVisible(false);
          return;
        }
      }
      
      // Delay before showing up
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [currentUser, cards]);

  const handleSnooze = (hours) => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);
    localStorage.setItem('rogerSnoozeUntil', snoozeUntil.toISOString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '10px',
        animation: 'slideUpMascot 0.5s ease-out forwards'
      }}
    >
      <div 
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--accent-primary)',
          borderRadius: '12px 12px 0 12px',
          padding: '10px 15px',
          boxShadow: 'var(--shadow-lg)',
          maxWidth: '220px',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div>
          <strong style={{ color: 'var(--status-danger)' }}>Attenzione!🚨</strong><br/>
          Hai <strong>{overdueCount}</strong> task in ritardo!
        </div>
        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
          <button 
            onClick={() => handleSnooze(1)}
            style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
          >
            Snooze 1h
          </button>
          <button 
            onClick={() => handleSnooze(24)}
            style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
          >
            A domani
          </button>
        </div>
        <button 
          onClick={() => { if(setView) setView('myTasks'); setIsVisible(false); }}
          style={{ width: '100%', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
        >
          Vedi Task
        </button>
      </div>

      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: 'var(--bg-elevated)',
        border: '2px solid var(--accent-primary)',
        boxShadow: 'var(--shadow-md)',
        backgroundImage: "url('/roger.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        flexShrink: 0
      }} />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUpMascot {
          0% { transform: translateY(100px) scale(0.5); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
