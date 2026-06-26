"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Solo per setup
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Controlliamo in modo pubblico se il DB è vuoto tramite la rotta di auth/setup
    fetch('/api/auth/setup')
      .then(res => res.json())
      .then(data => {
        if (data.isSetupRequired) {
          setIsSetupMode(true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isSetupMode) {
      // 1. Creazione primo account Admin
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        return setError(data.error || 'Errore durante il setup');
      }
      setIsSetupMode(false); // Fatto! Ora facciamo login automatico sotto
    }

    // 2. Esecuzione del Login effettivo
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (loginRes.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await loginRes.json();
      setError(data.error || 'Login fallito. Controlla email e password.');
    }
  };

  if (loading) return <div className={styles.container}>Caricamento ambiente di sicurezza...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isSetupMode ? "Setup Amministratore" : "Accedi al Gestionale"}</h1>
        {isSetupMode && <p className={styles.subtitle}>Benvenuto! Non esiste ancora nessun utente. Crea subito il tuo account "Dio" (Admin).</p>}
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {isSetupMode && (
            <div className={styles.inputGroup}>
              <label>Il tuo Nome Completo</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Es. Marco Rossi" className={styles.input} />
            </div>
          )}
          <div className={styles.inputGroup}>
            <label>Email Aziendale</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className={styles.input} />
          </div>
          <div className={styles.inputGroup}>
            <label>Password Segreta</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={styles.input} />
          </div>
          <button type="submit" className={styles.submitBtn}>
            {isSetupMode ? "Crea Admin ed Entra" : "Accedi Sicuro"}
          </button>
        </form>
      </div>
    </div>
  );
}
