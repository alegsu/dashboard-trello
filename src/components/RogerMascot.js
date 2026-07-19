"use client";
import React, { useState, useEffect } from 'react';

export default function RogerMascot({ currentUser, cards, setView }) {
  const [message, setMessage] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Controllo Scadenze
    let myOverdueCount = 0;
    if (cards) {
      myOverdueCount = cards.filter(c => {
        if (c.isArchived) return false;
        if (c.list && (c.list.name.toLowerCase().includes('fatto') || c.list.name.toLowerCase().includes('completat'))) return false;
        if (!c.assignees || !c.assignees.some(a => a.id === currentUser.id)) return false;
        if (c.due && new Date(c.due) < new Date()) return true;
        return false;
      }).length;
    }

    // Controllo Pausa Relax (se ha lavorato più di 120 minuti effettivi)
    const activeMins = currentUser.activeTimeToday || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const lastBreakStr = localStorage.getItem('lastBreakReminderDate');

    setTimeout(() => {
      if (activeMins >= 120 && lastBreakStr !== todayStr) {
        setMessage(
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Woof! 🐾</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Lavori da oltre due ore di fila! Stacca la spina 10 minuti e prenditi un bel caffè ☕</p>
            <button 
              onClick={(e) => { e.stopPropagation(); localStorage.setItem('lastBreakReminderDate', todayStr); setIsVisible(false); }}
              style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Ricevuto!
            </button>
          </div>
        );
        setIsVisible(true);
      } else if (myOverdueCount > 0) {
        // Se ha scadenze, mostriamole
        setMessage(
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: 'var(--status-danger)' }}>Attenzione! 🚨</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Hai <strong>{myOverdueCount}</strong> schede in ritardo! Diamo un'occhiata?</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsVisible(false); setView('mytasks'); }}
              style={{ background: 'var(--status-danger)', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Vai a La Mia Giornata
            </button>
          </div>
        );
        setIsVisible(true);
      }
    }, 3000); // Mostra dopo 3 secondi per non disturbare il caricamento

  }, [currentUser, cards, setView]);

  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        animation: 'slideUpBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        padding: '1rem',
        borderRadius: '12px 12px 0 12px',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '220px',
        position: 'relative',
        transformOrigin: 'bottom right',
        transition: 'transform 0.2s',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)'
      }}>
        {message}
        {/* Freccetta del fumetto */}
        <div style={{
          position: 'absolute',
          bottom: '-10px',
          right: '20px',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderTop: '10px solid var(--border-color)',
          borderRight: '10px solid transparent',
        }}>
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '-9px',
            width: 0,
            height: 0,
            borderLeft: '9px solid transparent',
            borderTop: '9px solid var(--bg-primary)',
            borderRight: '9px solid transparent',
          }} />
        </div>
        
        {/* Pulsante di chiusura se l'utente non vuole interagire */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
          style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'var(--bg-secondary)',
        overflow: 'hidden',
        border: '2px solid var(--accent-primary)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        transform: isHovered ? 'rotate(-5deg) scale(1.1)' : 'rotate(0) scale(1)'
      }}
      onClick={() => setIsVisible(!isVisible)}
      >
        <img 
          src="/roger.png" 
          alt="Roger Mascot" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1bdcf' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E"; }}
        />
      </div>

      <style>{`
        @keyframes slideUpBounce {
          0% { transform: translateY(100px) scale(0.5); opacity: 0; }
          70% { transform: translateY(-10px) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
