"use client";
import React, { useState, useEffect } from 'react';
import styles from './SettingsPanel.module.css';

export default function ManagementPanel({ members = [], clients = [], currentUser }) {
  const [liveMembers, setLiveMembers] = useState(members || []);
  const [expandedUserId, setExpandedUserId] = useState(null);

  useEffect(() => {
    const fetchUsers = () => {
      fetch('/api/users', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setLiveMembers(data);
          }
        });
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  const getClientEffortsForUser = (userName) => {
    let clientsData = [];
    clients.forEach(client => {
      if (client.sheetData) {
        try {
          const parsed = JSON.parse(client.sheetData);
          if (parsed.servicesDetails) {
            let assignedServices = [];
            Object.entries(parsed.servicesDetails).forEach(([serviceName, collaborators]) => {
              const collab = collaborators.find(c => (c.name || '').toLowerCase() === (userName || '').toLowerCase());
              if (collab) {
                let effortNum = 0;
                if (collab.effort) {
                  effortNum = parseInt(String(collab.effort).replace(/\D/g, ''), 10) || 0;
                }
                if (effortNum === 0) effortNum = Math.floor(100 / collaborators.length);

                let allCollaboratorsForService = collaborators.map(c => {
                  let e = 0;
                  if (c.effort) e = parseInt(String(c.effort).replace(/\D/g, ''), 10) || 0;
                  if (e === 0) e = Math.floor(100 / collaborators.length);
                  return { name: c.name, effort: e };
                }).sort((a,b) => b.effort - a.effort);
                
                assignedServices.push({ service: serviceName, effort: effortNum, allCollaborators: allCollaboratorsForService });
              }
            });
            if (assignedServices.length > 0) {
              clientsData.push({ client, assignedServices });
            }
          }
        } catch (e) {}
      }
    });
    return clientsData;
  };

  const maxCards = Math.max(...liveMembers.map(m => m._count?.cards || 0), 0);
  const maxTasks = Math.max(...liveMembers.map(m => m._count?.checklistItems || 0), 0);
  const maxLists = Math.max(...liveMembers.map(m => m._count?.lists || 0), 0);
  const maxClientsVal = Math.max(...liveMembers.map(m => getClientEffortsForUser(m.name).length), 0);
  const maxProjects = Math.max(...liveMembers.map(m => m._count?.projects || 0), 0);
  const globalMax = Math.max(maxCards, maxTasks, maxLists, maxClientsVal, maxProjects, 1);

  const effectiveCurrentUser = liveMembers.find(m => m.id === currentUser?.id) || currentUser;

  if (effectiveCurrentUser?.role !== 'admin') {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Accesso Negato: Solo Amministratori</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>👑 Management Dashboard</h2>
      <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>Riepilogo delle prestazioni e dei carichi di lavoro del team.</p>

      <div className={styles.card}>
        <h3>📊 Prestazioni del Team</h3>
        
        <div style={{ overflowX: 'auto', marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ background: 'var(--bg-elevated)', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Utente</th>
                <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Utilizzo (Ore & Logins)</th>
                <th style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>Carico Operativo Totale</th>
              </tr>
            </thead>
            <tbody>
              {liveMembers.map(m => {
                const clientEfforts = getClientEffortsForUser(m.name);
                
                const aggregatedServices = {};
                clientEfforts.forEach(ce => {
                  ce.assignedServices.forEach(s => {
                    if (!aggregatedServices[s.service]) aggregatedServices[s.service] = 0;
                    aggregatedServices[s.service]++;
                  });
                });
                const serviceEntries = Object.entries(aggregatedServices);
                
                const isExpanded = expandedUserId === m.id;
                
                return (
                <React.Fragment key={m.id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)', background: isExpanded ? 'rgba(0,0,0,0.05)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem', cursor: 'pointer' }} onClick={() => setExpandedUserId(isExpanded ? null : m.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className={styles.avatar} style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{(m.name || '?').charAt(0).toUpperCase()}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isExpanded ? 'var(--accent-primary)' : 'inherit' }}>
                            {m.name || 'Utente Sconosciuto'} 
                            <span style={{ fontSize: '0.55rem', opacity: 0.7, padding: '0.1rem 0.3rem', background: 'var(--bg-elevated)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{isExpanded ? '▼ Espanso' : '▶ Dettagli'}</span>
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.email || 'Nessuna email'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      <div style={{ marginBottom: '2px' }}><strong>Logins:</strong> {m.loginCount || 0}</div>
                      <div><strong>Durata:</strong> {m.totalUsageTime ? Math.floor(m.totalUsageTime / 60) : 0}h {m.totalUsageTime ? m.totalUsageTime % 60 : 0}m</div>
                    </td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', width: '40%' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ whiteSpace: 'nowrap' }}><span style={{color: 'var(--accent-secondary, #a1bdcf)'}}>●</span> Task ({m._count?.cards || 0})</span>
                        <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--accent-secondary, #a1bdcf)', height: '100%', width: `${((m._count?.cards || 0) / globalMax) * 100}%` }}></div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ whiteSpace: 'nowrap' }}><span style={{color: 'var(--status-warning)'}}>●</span> Sottotask ({m._count?.checklistItems || 0})</span>
                        <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--status-warning)', height: '100%', width: `${((m._count?.checklistItems || 0) / globalMax) * 100}%` }}></div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ whiteSpace: 'nowrap' }}><span style={{color: 'var(--status-success)'}}>●</span> Bacheche ({m._count?.lists || 0})</span>
                        <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--status-success)', height: '100%', width: `${((m._count?.lists || 0) / globalMax) * 100}%` }}></div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ whiteSpace: 'nowrap' }}><span style={{color: '#8b5cf6'}}>●</span> Clienti ({clientEfforts.length})</span>
                        <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                          <div style={{ background: '#8b5cf6', height: '100%', width: `${(clientEfforts.length / globalMax) * 100}%` }}></div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(max-content, 110px) 1fr', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ whiteSpace: 'nowrap' }}><span style={{color: '#f97316'}}>●</span> Progetti ({m._count?.projects || 0})</span>
                        <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                          <div style={{ background: '#f97316', height: '100%', width: `${((m._count?.projects || 0) / globalMax) * 100}%` }}></div>
                        </div>
                      </div>
                      {serviceEntries.length > 0 && (
                        <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {serviceEntries.map(([srv, count], idx) => (
                            <span key={idx} style={{ background: 'var(--bg-elevated)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.65rem' }}>
                              {srv}: <strong>{count}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                      <td colSpan="3" style={{ padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Dettaglio Clienti e Carico Lavoro</h4>
                        {clientEfforts.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Nessun cliente assegnato nei Fogli Google.</p>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {clientEfforts.map((ce, idx) => (
                              <div key={idx} style={{ background: 'var(--bg-elevated)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <strong style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem' }}>{ce.client.name}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {ce.assignedServices.map((s, i) => {
                                    return (
                                      <div key={i} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: i < ce.assignedServices.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>• {s.service}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingLeft: '0.8rem' }}>
                                          {s.allCollaborators.map((c, cIdx) => {
                                            let color = 'var(--status-success)';
                                            if (c.effort >= 100) color = 'var(--status-danger)';
                                            else if (c.effort >= 50) color = 'var(--status-warning)';
                                            const isMe = (c.name || '').toLowerCase() === (m.name || '').toLowerCase();
                                            return (
                                              <span key={cIdx} style={{ background: isMe ? 'var(--accent-primary)' : 'var(--bg-primary)', color: isMe ? 'white' : 'var(--text-secondary)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--border-color)' }}>
                                                {c.name}: <strong style={{ color: isMe ? 'white' : color }}>{c.effort}%</strong>
                                              </span>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                );
              })}
              {liveMembers.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Nessun membro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
