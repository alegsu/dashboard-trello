"use client";
import React, { useState, useEffect } from 'react';

export default function WelcomeToast({ currentUser }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const lastWelcomeStr = localStorage.getItem('lastWelcomeDate');
    
    if (lastWelcomeStr !== todayStr) {
      setTimeout(() => {
        setIsVisible(true);
        localStorage.setItem('lastWelcomeDate', todayStr);
        
        // Nascondi il toast dopo 6 secondi
        setTimeout(() => setIsVisible(false), 6000);
      }, 1000);
    }
  }, [currentUser]);

  if (!isVisible) return null;

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Guerriero';
  
  const greetings = [
    `Buongiorno ${firstName}! Pronti a spaccare tutto oggi? 🚀`,
    `Ehilà ${firstName}! Carico per un nuovo progetto? 💪`,
    `Benvenuto ${firstName}! Facciamo a pezzi quelle task oggi! 🔥`,
    `Ciao ${firstName}! Il caffè è pronto, andiamo a dominare! ☕`,
  ];
  
  // Pick random greeting based on the day of the year so it's consistent for the day but varies
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const selectedGreeting = greetings[dayOfYear % greetings.length];

  return (
    <div style={{
      position: 'fixed',
      top: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      background: 'rgba(30, 41, 59, 0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--accent-primary)',
      padding: '1rem 2rem',
      borderRadius: '30px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3), 0 0 15px rgba(161, 189, 207, 0.2)',
      color: '#fff',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      animation: 'slideDownFade 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <span style={{ fontSize: '1.2rem' }}>✨</span>
      {selectedGreeting}
      
      <style>{`
        @keyframes slideDownFade {
          0% { transform: translate(-50%, -50px); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
