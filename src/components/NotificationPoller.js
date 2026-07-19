"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function NotificationPoller({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const displayedIds = useRef(new Set());

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications/live?userId=${currentUser.id}`);
        if (!res.ok) return;
        const data = await res.json();
        
        // Find newly unread ones that we haven't displayed yet
        const newNots = data.filter(n => !displayedIds.current.has(n.id));
        if (newNots.length > 0) {
          // Add to displayed to avoid duplicate sounds/toasts in the same session
          newNots.forEach(n => displayedIds.current.add(n.id));
          
          setNotifications(prev => [...prev, ...newNots]);
          
          // Play sound
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
            // We use a tiny silent wav as fallback, but ideally we point to /pop.mp3 if we have it
            // For now, let's use a very short synthetic beep using Web Audio API if possible, or just a simple HTML5 audio
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
          } catch(e) { console.warn("Audio not supported"); }
        }
      } catch (e) {
        console.error("Error polling notifications:", e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const dismissNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Mark as read in DB
    try {
      await fetch('/api/notifications/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
    } catch (e) { console.error(e); }
  };

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '5rem',
      right: '2rem',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      {notifications.map(n => (
        <div 
          key={n.id}
          style={{
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--accent-primary)',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            color: '#fff',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            animation: 'slideInRight 0.3s ease-out',
            maxWidth: '300px'
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>💬</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Nuova Menzione!</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{n.message}</div>
            {n.link && <a href={n.link} style={{ display: 'block', marginTop: '6px', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Vedi Dettagli</a>}
          </div>
          <button 
            onClick={() => dismissNotification(n.id)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
