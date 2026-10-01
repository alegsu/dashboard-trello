import React, { useState, useEffect } from 'react';
import styles from './ProjectsView.module.css'; // Possiamo riusare questo CSS per comodità
import { FaSync, FaGoogle, FaTrash, FaEye, FaEyeSlash, FaEdit, FaCheck, FaTimes, FaCog, FaPlus } from 'react-icons/fa';

export const PRESET_SERVICES = [
  { key: 'POST SOCIAL', label: '📱 Post Social', short: 'Social' },
  { key: 'STORIE', label: '📸 Storie / Reels', short: 'Storie' },
  { key: 'NEWSLETTER', label: '✉️ Newsletter / DEM', short: 'Newsletter' },
  { key: 'ADV', label: '🎯 ADV / Ads', short: 'ADV' },
  { key: 'SHOOTING', label: '🎬 Shooting Foto/Video', short: 'Shooting' },
  { key: 'BLOG POST', label: '✍️ Blog Post / Copy', short: 'Blog' },
  { key: 'SITO WEB', label: '💻 Sito Web / Dev', short: 'Sito' },
  { key: 'GRAFICA', label: '🎨 Grafica / Brand', short: 'Grafica' }
];

export const parseClientServices = (sheetDataStr) => {
  if (!sheetDataStr) return { services: [], servicesDetails: {}, effort: '' };
  try {
    const data = JSON.parse(sheetDataStr);
    return {
      effort: data.effort || '',
      services: Array.isArray(data.services) ? data.services : Object.keys(data.servicesDetails || {}),
      servicesDetails: data.servicesDetails || {}
    };
  } catch {
    return { services: [], servicesDetails: {}, effort: '' };
  }
};

export const getMemberServicesForClient = (client, memberName) => {
  if (!client || !memberName) return [];
  const { servicesDetails } = parseClientServices(client.sheetData);
  const target = memberName.trim().toUpperCase();
  const matched = [];
  Object.entries(servicesDetails || {}).forEach(([serviceKey, users]) => {
    if (Array.isArray(users) && users.some(u => (u.name || '').trim().toUpperCase() === target)) {
      matched.push(serviceKey);
    }
  });
  return matched;
};

export default function ClientsView({ clients: initialClients, cards = [], members = [], onRefresh, onOpenNotebook }) {
  const [clients, setClients] = useState(initialClients);
  const [selectedClient, setSelectedClient] = useState(null);
  const [notebookModalClient, setNotebookModalClient] = useState(null);
  
  // Campi Form
  const [name, setName] = useState('');
  const [notebookLmUrl, setNotebookLmUrl] = useState('');
  const [claudeUrl, setClaudeUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('');
  const [status, setStatus] = useState('CLIENTE');
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState([]);
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  
  // Vista Tabella / Matrice & Filtri
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('ALL');
  const [tableCollaboratorFilter, setTableCollaboratorFilter] = useState(null);
  const [tableMode, setTableMode] = useState('matrix'); // 'matrix' | 'list'
  const [updatingAssignmentKey, setUpdatingAssignmentKey] = useState(null);
  const [showHiddenAndOld, setShowHiddenAndOld] = useState(false);

  // Rinomina Rapida Inline
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientName, setEditingClientName] = useState('');

  // Modale Assegnazione Compiti (Newsletter, Social, ecc.)
  const [taskModalData, setTaskModalData] = useState(null); // { client, member }
  const [taskModalSelectedKeys, setTaskModalSelectedKeys] = useState([]);
  const [newCustomTaskInput, setNewCustomTaskInput] = useState('');
  const [rubricaNewServiceInput, setRubricaNewServiceInput] = useState('');
  
  const [mergeTargetId, setMergeTargetId] = useState('');

  const defaultPlan = {
    monday: { post: 0, reel: 0, video: 0, stories: 0 },
    tuesday: { post: 0, reel: 0, video: 0, stories: 0 },
    wednesday: { post: 0, reel: 0, video: 0, stories: 0 },
    thursday: { post: 0, reel: 0, video: 0, stories: 0 },
    friday: { post: 0, reel: 0, video: 0, stories: 0 },
    saturday: { post: 0, reel: 0, video: 0, stories: 0 },
    sunday: { post: 0, reel: 0, video: 0, stories: 0 }
  };
  const [socialPlan, setSocialPlan] = useState(defaultPlan);
  const [pedSheets, setPedSheets] = useState({});
  const [pedMonthStr, setPedMonthStr] = useState('');
  const [pedUrlInput, setPedUrlInput] = useState('');
  const [isSyncingPed, setIsSyncingPed] = useState(false);
  
  // Google Sheets Sync
  const [csvUrl, setCsvUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtri
  const [filterActive, setFilterActive] = useState(true);

  // Expandables
  const [showAI, setShowAI] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

  useEffect(() => {
    setClients(initialClients);
    if (selectedClient) {
      const freshSelected = (initialClients || []).find(c => c.id === selectedClient.id);
      if (freshSelected) {
        setSelectedClient(freshSelected);
        setSelectedCollaboratorIds((freshSelected.collaborators || []).map(u => u.id));
      }
    }

    // Fetch global settings for CSV URL
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.SHEETS_CSV_URL) setCsvUrl(data.SHEETS_CSV_URL);
    });
  }, [initialClients]);

  const toggleCollaborator = (userId) => {
    setSelectedCollaboratorIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllCollaborators = () => {
    setSelectedCollaboratorIds((members || []).map(m => m.id));
  };

  const deselectAllCollaborators = () => {
    setSelectedCollaboratorIds([]);
  };

  // Rinomina Rapida
  const handleRenameClient = async (clientId, newName) => {
    if (!newName || !newName.trim()) {
      setEditingClientId(null);
      return;
    }
    const trimmed = newName.trim();
    setClients(prev => (prev || []).map(c => c.id === clientId ? { ...c, name: trimmed } : c));
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => ({ ...prev, name: trimmed }));
      setName(trimmed);
    }
    setEditingClientId(null);

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      if (onRefresh) onRefresh();
    }
  };

  // Cambio Stato / Nascondi
  const handleUpdateClientStatus = async (clientId, newStatus) => {
    setClients(prev => (prev || []).map(c => c.id === clientId ? { ...c, status: newStatus } : c));
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => ({ ...prev, status: newStatus }));
      setStatus(newStatus);
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      if (onRefresh) onRefresh();
    }
  };

  const handleToggleHideClient = async (client) => {
    const isHidden = client.status === 'NASCOSTO';
    const newStatus = isHidden ? 'CLIENTE' : 'NASCOSTO';
    await handleUpdateClientStatus(client.id, newStatus);
  };

  // Apertura modale compiti per collaboratore-cliente
  const openTaskModal = (client, member) => {
    const userTasks = getMemberServicesForClient(client, member.name);
    setTaskModalSelectedKeys(userTasks);
    setNewCustomTaskInput('');
    setTaskModalData({ client, member });
  };

  // Salvataggio compiti utente per cliente
  const handleSaveMemberTasks = async (client, member, selectedTaskKeys) => {
    const currentData = parseClientServices(client.sheetData);
    const newServicesDetails = { ...currentData.servicesDetails };
    const memberNameUpper = member.name.trim().toUpperCase();

    // 1. Rimuovi utente dai compiti non selezionati
    Object.keys(newServicesDetails).forEach(svc => {
      if (!selectedTaskKeys.includes(svc)) {
        newServicesDetails[svc] = (newServicesDetails[svc] || []).filter(
          u => (u.name || '').trim().toUpperCase() !== memberNameUpper
        );
      }
    });

    // 2. Aggiungi utente ai compiti selezionati
    selectedTaskKeys.forEach(svc => {
      if (!newServicesDetails[svc]) {
        newServicesDetails[svc] = [];
      }
      const alreadyIn = newServicesDetails[svc].some(
        u => (u.name || '').trim().toUpperCase() === memberNameUpper
      );
      if (!alreadyIn) {
        newServicesDetails[svc].push({ name: member.name });
      }
    });

    const allServicesSet = new Set([
      ...(currentData.services || []),
      ...selectedTaskKeys,
      ...Object.keys(newServicesDetails)
    ]);
    const newServices = Array.from(allServicesSet);

    const newSheetDataObj = {
      ...currentData,
      services: newServices,
      servicesDetails: newServicesDetails
    };
    const newSheetDataStr = JSON.stringify(newSheetDataObj);

    // Sincronizza collaboratori: se l'utente ha almeno un compito o era già associato
    const currentCollabIds = (client.collaborators || []).map(u => u.id);
    let newCollabIds = [...currentCollabIds];
    if (selectedTaskKeys.length > 0 && !newCollabIds.includes(member.id)) {
      newCollabIds.push(member.id);
    }

    const updatedCollaborators = newCollabIds
      .map(id => (members || []).find(m => m.id === id))
      .filter(Boolean);

    const updatedClient = {
      ...client,
      sheetData: newSheetDataStr,
      collaborators: updatedCollaborators
    };

    setClients(prev => (prev || []).map(c => c.id === client.id ? updatedClient : c));
    if (selectedClient?.id === client.id) {
      setSelectedClient(updatedClient);
      setSelectedCollaboratorIds(newCollabIds);
    }

    setTaskModalData(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetData: newSheetDataStr,
          collaborators: newCollabIds
        })
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      if (onRefresh) onRefresh();
    }
  };

  // Toggle rapido assegnazione in tabella
  const handleToggleAssignmentInTable = async (client, userId) => {
    const targetMember = (members || []).find(m => m.id === userId);
    if (!targetMember) return;

    const currentIds = (client.collaborators || []).map(u => u.id);
    const isCurrentlyAssigned = currentIds.includes(userId);

    // Se non è ancora assegnato, lo assegniamo e apriamo direttamente il configuratore compiti
    if (!isCurrentlyAssigned) {
      const newIds = [...currentIds, userId];
      const updatedCollaborators = [...(client.collaborators || []), targetMember];
      const updatedClient = { ...client, collaborators: updatedCollaborators };

      setClients(prev => (prev || []).map(c => c.id === client.id ? updatedClient : c));
      if (selectedClient?.id === client.id) {
        setSelectedClient(updatedClient);
        setSelectedCollaboratorIds(newIds);
      }

      openTaskModal(client, targetMember);

      try {
        await fetch(`/api/clients/${client.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collaborators: newIds })
        });
        if (onRefresh) onRefresh();
      } catch(e) {
        console.error(e);
      }
      return;
    }

    // Se è già assegnato, apriamo la modale compiti per permettere di configurarlo o rimuoverlo
    openTaskModal(client, targetMember);
  };

  const openClientDetailsFromTable = (client) => {
    handleSelectClient(client);
    setViewMode('cards');
  };

  const getClientActiveCardsCount = (clientId) => {
    return (cards || []).filter(card => card.clientId === clientId && !card.isArchived).length;
  };

  const handleAddServiceInRubrica = async (svcKey) => {
    if (!selectedClient) return;
    const currentData = parseClientServices(selectedClient.sheetData);
    const newServices = Array.from(new Set([...(currentData.services || []), svcKey]));
    const newServicesDetails = { ...currentData.servicesDetails };
    if (!newServicesDetails[svcKey]) {
      newServicesDetails[svcKey] = [];
    }
    const newSheetData = JSON.stringify({ ...currentData, services: newServices, servicesDetails: newServicesDetails });
    const updatedClient = { ...selectedClient, sheetData: newSheetData };
    setSelectedClient(updatedClient);
    setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));

    try {
      await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetData: newSheetData })
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveServiceInRubrica = async (svcKey) => {
    if (!selectedClient) return;
    const currentData = parseClientServices(selectedClient.sheetData);
    const newServices = (currentData.services || []).filter(s => s !== svcKey);
    const newServicesDetails = { ...currentData.servicesDetails };
    delete newServicesDetails[svcKey];

    const newSheetData = JSON.stringify({ ...currentData, services: newServices, servicesDetails: newServicesDetails });
    const updatedClient = { ...selectedClient, sheetData: newSheetData };
    setSelectedClient(updatedClient);
    setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));

    try {
      await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetData: newSheetData })
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUserToServiceInRubrica = async (svcKey, memberName) => {
    if (!selectedClient || !memberName) return;
    const currentData = parseClientServices(selectedClient.sheetData);
    const newServicesDetails = { ...currentData.servicesDetails };
    if (!newServicesDetails[svcKey]) newServicesDetails[svcKey] = [];

    const upper = memberName.trim().toUpperCase();
    if (!newServicesDetails[svcKey].some(u => (u.name || '').toUpperCase() === upper)) {
      newServicesDetails[svcKey].push({ name: memberName.trim() });
    }

    const newServices = Array.from(new Set([...(currentData.services || []), svcKey]));
    const newSheetData = JSON.stringify({ ...currentData, services: newServices, servicesDetails: newServicesDetails });

    // Sync collaborators
    const memberObj = (members || []).find(m => m.name.toUpperCase() === upper);
    let newCollabIds = (selectedClient.collaborators || []).map(u => u.id);
    if (memberObj && !newCollabIds.includes(memberObj.id)) {
      newCollabIds.push(memberObj.id);
    }
    const updatedCollaborators = newCollabIds.map(id => (members || []).find(m => m.id === id)).filter(Boolean);

    const updatedClient = { ...selectedClient, sheetData: newSheetData, collaborators: updatedCollaborators };
    setSelectedClient(updatedClient);
    setSelectedCollaboratorIds(newCollabIds);
    setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));

    try {
      await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetData: newSheetData, collaborators: newCollabIds })
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveUserFromServiceInRubrica = async (svcKey, memberName) => {
    if (!selectedClient || !memberName) return;
    const currentData = parseClientServices(selectedClient.sheetData);
    const newServicesDetails = { ...currentData.servicesDetails };
    const upper = memberName.trim().toUpperCase();
    if (newServicesDetails[svcKey]) {
      newServicesDetails[svcKey] = newServicesDetails[svcKey].filter(u => (u.name || '').toUpperCase() !== upper);
    }

    const newSheetData = JSON.stringify({ ...currentData, servicesDetails: newServicesDetails });
    const updatedClient = { ...selectedClient, sheetData: newSheetData };
    setSelectedClient(updatedClient);
    setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));

    try {
      await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetData: newSheetData })
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTableClients = clients.filter(c => {
    // Escludi nascosti e vecchi se il toggle non è attivo
    if (!showHiddenAndOld && tableStatusFilter === 'ALL') {
      if (c.status === 'NASCOSTO' || c.status === 'OBSOLETO') return false;
    }

    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchCollaborator = (c.collaborators || []).some(u => (u.name || '').toLowerCase().includes(q));
      const { services } = parseClientServices(c.sheetData);
      const matchService = services.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchCollaborator && !matchService) return false;
    }

    if (tableStatusFilter !== 'ALL') {
      if ((c.status || 'CLIENTE') !== tableStatusFilter) return false;
    }

    if (tableCollaboratorFilter === 'UNASSIGNED') {
      if ((c.collaborators || []).length > 0) return false;
    } else if (tableCollaboratorFilter) {
      if (!(c.collaborators || []).some(u => u.id === tableCollaboratorFilter)) return false;
    }

    return true;
  });

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setName(c.name || '');
    setNotebookLmUrl(c.notebookLmUrl || '');
    setClaudeUrl(c.claudeUrl || '');
    setNotes(c.notes || '');
    setColor(c.color || '');
    setStatus(c.status || 'CLIENTE');
    setMergeTargetId('');
    setSelectedCollaboratorIds((c.collaborators || []).map(u => u.id));
    setCollaboratorSearch('');
    try {
      setSocialPlan(c.socialPlan ? JSON.parse(c.socialPlan) : defaultPlan);
    } catch {
      setSocialPlan(defaultPlan);
    }
    try {
      setPedSheets(c.pedSheets ? JSON.parse(c.pedSheets) : {});
    } catch {
      setPedSheets({});
    }
    setPedMonthStr('');
    setPedMonthStr('');
    setPedUrlInput('');
  };

  const handleAddPed = async () => {
    if (!pedMonthStr || !pedUrlInput) return;
    const newPed = { ...(pedSheets || {}), [pedMonthStr]: pedUrlInput };
    setPedSheets(newPed);
    setPedUrlInput('');
    
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedSheets: JSON.stringify(newPed) })
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        alert("Errore durante il salvataggio del link PED.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePed = async (monthToRemove) => {
    const newPed = { ...(pedSheets || {}) };
    delete newPed[monthToRemove];
    setPedSheets(newPed);
    
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedSheets: JSON.stringify(newPed) })
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          notebookLmUrl,
          claudeUrl,
          notes,
          color,
          status,
          socialPlan: JSON.stringify(socialPlan),
          pedSheets: JSON.stringify(pedSheets),
          collaborators: selectedCollaboratorIds
        })
      });

      if (res.ok) {
        const updatedClient = await res.json();
        if (onRefresh) onRefresh();
        alert('Dati cliente salvati con successo!');
        setSelectedClient(updatedClient);
        setClients(prev => (prev || []).map(item => item.id === updatedClient.id ? updatedClient : item));
        setSelectedCollaboratorIds((updatedClient.collaborators || []).map(u => u.id));
      } else {
        alert('Errore durante il salvataggio.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    if (!confirm(`Sei sicuro di voler eliminare definitivamente il cliente "${selectedClient.name}"? Tutte le schede e i progetti ad esso assegnati diventeranno "Senza Cliente".`)) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onRefresh) onRefresh();
        setSelectedClient(null);
        alert('Cliente eliminato!');
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleMerge = async () => {
    if (!selectedClient || !mergeTargetId) return;
    const targetClient = clients.find(c => c.id === mergeTargetId);
    if (!confirm(`Tutte le schede e progetti di "${selectedClient.name}" verranno spostati in "${targetClient.name}". Il cliente "${selectedClient.name}" verrà eliminato. Procedere?`)) return;

    try {
      const res = await fetch('/api/clients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: selectedClient.id, targetId: mergeTargetId })
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
        setSelectedClient(null);
        alert('Clienti uniti con successo!');
      } else {
        alert('Errore durante la fusione.');
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleConvertToSupplier = async () => {
    if (!selectedClient) return;
    if (!confirm(`Sei sicuro di voler convertire "${selectedClient.name}" in un Fornitore/Tool? Il cliente verrà rimosso da questa lista e inserito negli Accessi.`)) return;

    try {
      // 1. Create Access
      const resAccess = await fetch('/api/accesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedClient.name,
          notes: selectedClient.notes || '',
          type: 'SUPPLIER',
          showInCard: false
        })
      });

      if (!resAccess.ok) throw new Error('Errore creazione accesso');

      // 2. Delete Client
      const resDel = await fetch(`/api/clients/${selectedClient.id}`, { method: 'DELETE' });
      if (resDel.ok) {
        if (onRefresh) onRefresh();
        setSelectedClient(null);
        alert('Convertito con successo!');
      }
    } catch(err) {
      console.error(err);
      alert('Errore durante la conversione');
    }
  };

  const handleSyncSheets = async () => {
    if (!csvUrl) return alert("Inserisci il link CSV di Google Sheets");
    
    setIsSyncing(true);
    try {
      // Salva l'URL nelle impostazioni globali
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SHEETS_CSV_URL: csvUrl })
      });

      const res = await fetch('/api/sync/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvUrl })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`Sincronizzazione completata!\nClienti creati: ${data.results.clientsCreated}\nClienti aggiornati: ${data.results.clientsUpdated}\nNuovi utenti creati: ${data.results.usersCreated}`);
        if (onRefresh) onRefresh();
      } else {
        alert("Errore sinc: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Errore di rete durante la sincronizzazione.");
    }
    setIsSyncing(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>👥 Rubrica e Hub Clienti</h2>

            {/* Switch tra Vista Rubrica e Vista Tabella Matrice */}
            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'cards' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'cards' ? '#000' : 'var(--text-secondary)',
                  fontWeight: viewMode === 'cards' ? 'bold' : 'normal',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📇</span> Rubrica & Schede
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'table' ? '#000' : 'var(--text-secondary)',
                  fontWeight: viewMode === 'table' ? 'bold' : 'normal',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>📊</span> Tabella Matrice Clienti / Utenti
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <FaGoogle color="#4285F4" />
            <input 
              type="url" 
              placeholder="Link Pubblica sul Web (CSV)"
              value={csvUrl}
              onChange={e => setCsvUrl(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', width: '220px', fontSize: '0.8rem' }}
            />
            <button onClick={handleSyncSheets} disabled={isSyncing} style={{ padding: '0.35rem 0.75rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
              <FaSync className={isSyncing ? 'fa-spin' : ''} />
              {isSyncing ? 'Sincronizzo...' : 'Sincronizza da Fogli'}
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'cards' && (
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {/* Lista Clienti */}
        <div style={{ flex: '1 1 300px', background: 'var(--bg-glass)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
              I Tuoi Clienti ({clients.filter(c => {
                if (!showHiddenAndOld && (c.status === 'NASCOSTO' || c.status === 'OBSOLETO')) return false;
                return filterActive ? !!c.sheetData : true;
              }).length})
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={filterActive} onChange={e => setFilterActive(e.target.checked)} />
                Fogli
              </label>
              <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: showHiddenAndOld ? 'var(--status-warning)' : 'var(--text-secondary)' }} title="Mostra anche clienti nascosti e vecchi">
                <input type="checkbox" checked={showHiddenAndOld} onChange={e => setShowHiddenAndOld(e.target.checked)} />
                Nascosti
              </label>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {clients.filter(c => {
              if (!showHiddenAndOld && (c.status === 'NASCOSTO' || c.status === 'OBSOLETO')) return false;
              return filterActive ? !!c.sheetData : true;
            }).map((c, index) => (
              <li 
                key={c.id} 
                onClick={() => handleSelectClient(c)}
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid var(--border-color)', 
                  cursor: 'pointer',
                  background: selectedClient?.id === c.id ? 'var(--bg-elevated)' : (index % 2 === 0 ? 'transparent' : 'rgba(161, 189, 207, 0.05)'),
                  fontWeight: selectedClient?.id === c.id ? 'bold' : 'normal',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.name}</span>
                    {c.status && c.status !== 'CLIENTE' && (
                      <span style={{
                        fontSize: '0.62rem',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        background: c.status === 'UNA_TANTUM' ? 'rgba(168, 85, 247, 0.15)' : (c.status === 'PROSPECT' ? 'rgba(234, 179, 8, 0.15)' : (c.status === 'NASCOSTO' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)')),
                        color: c.status === 'UNA_TANTUM' ? '#c084fc' : (c.status === 'PROSPECT' ? 'var(--status-warning)' : (c.status === 'NASCOSTO' ? 'var(--status-danger)' : 'var(--text-secondary)'))
                      }}>
                        {c.status === 'UNA_TANTUM' ? '1-Spot' : (c.status === 'NASCOSTO' ? 'Nascosto' : (c.status === 'OBSOLETO' ? 'Vecchio' : c.status))}
                      </span>
                    )}
                    {c.collaborators && c.collaborators.length > 0 && (
                      <span 
                        style={{ 
                          fontSize: '0.65rem', 
                          background: 'rgba(34, 197, 94, 0.15)', 
                          color: 'var(--accent-primary, #22c55e)', 
                          padding: '0.05rem 0.4rem', 
                          borderRadius: '10px',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          whiteSpace: 'nowrap',
                          fontWeight: 'bold'
                        }} 
                        title={`Collaboratori: ${c.collaborators.map(u => u.name).join(', ')}`}
                      >
                        👥 {c.collaborators.length}
                      </span>
                    )}
                  </div>
                  {c.collaborators && c.collaborators.length > 0 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {c.collaborators.slice(0, 3).map(u => u.name?.split(' ')[0]).join(', ')}
                      {c.collaborators.length > 3 ? ` +${c.collaborators.length - 3}` : ''}
                    </div>
                  )}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); if (onOpenNotebook) onOpenNotebook(c); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem', transition: 'transform 0.2s' }}
                  title="Apri Brain (IA)"
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  🧠
                </button>
              </li>
            ))}
            {clients.length === 0 && <p style={{color: 'var(--text-secondary)'}}>Nessun cliente presente.</p>}
          </ul>
        </div>

        {/* Dettagli Cliente Selezionato */}
        {selectedClient && (
          <div style={{ flex: '2 1 500px', background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Nome Cliente</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Stato</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)} 
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.05rem' }}
                  >
                    <option value="CLIENTE">🟢 Attivo (Continuativo)</option>
                    <option value="UNA_TANTUM">🟡 Una Tantum (Spot)</option>
                    <option value="PROSPECT">🔵 Prospect (Trattativa)</option>
                    <option value="OBSOLETO">⚪ Vecchio / Chiuso</option>
                    <option value="NASCOSTO">👁️‍🗨️ Nascosto (Archiviato)</option>
                  </select>
                </div>

                <button type="submit" style={{ padding: '0.5rem 1.5rem', background: 'var(--accent-primary)', color: 'black', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', marginTop: '1.2rem' }}>
                  Salva Modifiche
                </button>
              </div>

              {/* Sezione Collaboratori Assegnati */}
              <div style={{
                marginTop: '0.8rem',
                padding: '0.9rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>👥</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Collaboratori Assegnati</span>
                        <span style={{
                          fontSize: '0.72rem',
                          background: selectedCollaboratorIds.length > 0 ? 'var(--accent-primary, #22c55e)' : 'var(--bg-elevated)',
                          color: selectedCollaboratorIds.length > 0 ? '#000' : 'var(--text-secondary)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '10px',
                          fontWeight: 'bold'
                        }}>
                          {selectedCollaboratorIds.length}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        I collaboratori selezionati gestiscono questo cliente e ricevono i relativi avvisi.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={selectAllCollaborators}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      Tutti
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllCollaborators}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      Nessuno
                    </button>
                  </div>
                </div>

                {members.length > 6 && (
                  <input
                    type="text"
                    placeholder="🔍 Filtra collaboratori per nome..."
                    value={collaboratorSearch}
                    onChange={e => setCollaboratorSearch(e.target.value)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      maxWidth: '260px'
                    }}
                  />
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.2rem' }}>
                  {members
                    .filter(m => !collaboratorSearch || (m.name || '').toLowerCase().includes(collaboratorSearch.toLowerCase()))
                    .map(m => {
                      const isSelected = selectedCollaboratorIds.includes(m.id);
                      const initials = (m.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleCollaborator(m.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '20px',
                            border: isSelected ? '1px solid var(--accent-primary, #22c55e)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(34, 197, 94, 0.16)' : 'var(--bg-secondary)',
                            color: isSelected ? 'var(--accent-primary, #22c55e)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? '600' : 'normal',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--accent-primary, #22c55e)' : 'var(--bg-elevated)',
                              color: isSelected ? '#000' : 'var(--text-primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.62rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {initials}
                          </span>
                          <span>{m.name}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? 'bold' : 'normal' }}>
                            {isSelected ? '✓' : '+'}
                          </span>
                        </button>
                      );
                    })}
                  {members.length === 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Nessun collaboratore disponibile.</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Piano Editoriale Social</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginTop: '0.3rem' }}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const itDays = { monday: 'Lunedì', tuesday: 'Martedì', wednesday: 'Mercoledì', thursday: 'Giovedì', friday: 'Venerdì', saturday: 'Sabato', sunday: 'Domenica' };
                    return (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.3rem' }}>{itDays[day]}</div>
                        {['post', 'reel', 'video', 'stories'].map(type => (
                          <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                            <span style={{textTransform: 'capitalize'}}>{type}</span>
                            <input 
                              type="number" 
                              min="0" 
                              value={socialPlan?.[day]?.[type] || 0} 
                              onChange={e => setSocialPlan(prev => ({...prev, [day]: {...(prev?.[day] || {}), [type]: parseInt(e.target.value) || 0}}))}
                              style={{ width: '30px', padding: '0.1rem', fontSize: '0.75rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '2px', textAlign: 'center' }}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '1rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Piani Editoriali Mensili (Google Sheets)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="month" value={pedMonthStr} onChange={e => setPedMonthStr(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                  <input type="url" placeholder="https://docs.google.com/spreadsheets..." value={pedUrlInput} onChange={e => setPedUrlInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddPed(); } }} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                  <button type="button" onClick={(e) => { e.preventDefault(); handleAddPed(); }} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Aggiungi
                  </button>
                </div>
                {pedSheets && Object.keys(pedSheets).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    {Object.entries(pedSheets).map(([month, url]) => (
                      <div key={month} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '4px' }}>
                        <strong style={{ fontSize: '0.8rem', minWidth: '70px' }}>{month}</strong>
                        <a href={url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--accent-primary)' }}>{url}</a>
                        <button type="button" onClick={async (e) => {
                           e.preventDefault();
                           setIsSyncingPed(true);
                           try {
                             const res = await fetch('/api/sync/ped', {
                               method: 'POST',
                               headers: {'Content-Type': 'application/json'},
                               body: JSON.stringify({ clientId: selectedClient.id, monthKey: month, sheetUrl: url })
                             });
                             const data = await res.json();
                             if (data.success) alert(`Sincronizzazione completata: ${data.syncedCount} post aggiornati.`);
                             else alert('Errore: ' + data.error);
                           } catch (err) { alert('Errore di rete'); }
                           setIsSyncingPed(false);
                        }} disabled={isSyncingPed} style={{ padding: '0.2rem 0.5rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                          {isSyncingPed ? '...' : 'Sincronizza Ora'}
                        </button>
                        <button type="button" onClick={(e) => { e.preventDefault(); handleDeletePed(month); }} style={{ background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', padding: '0.2rem' }}>
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Colore Riga Bacheca</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={color || '#1E293B'} 
                    onChange={e => setColor(e.target.value)} 
                    style={{ width: '30px', height: '30px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <button type="button" onClick={() => setColor('')} style={{ padding: '0.2rem 0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem', cursor: 'pointer' }}>
                    Reset Colore
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                <div onClick={() => setShowAI(!showAI)} style={{ padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  <span>{showAI ? '−' : '+'}</span>
                  Link Esterni AI
                </div>
                
                {showAI && (
                  <div style={{ padding: '0 0.8rem 0.8rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Progetto NotebookLM</label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input 
                          type="url" 
                          value={notebookLmUrl} 
                          onChange={e => setNotebookLmUrl(e.target.value)} 
                          placeholder="https://notebooklm.google.com/..." 
                          style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                        />
                        {notebookLmUrl && (
                          <a href={notebookLmUrl} target="_blank" rel="noreferrer" style={{ padding: '0.4rem 0.8rem', background: 'var(--status-in-progress, #3b82f6)', color: 'white', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                            Apri
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Progetto Claude</label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input 
                          type="url" 
                          value={claudeUrl} 
                          onChange={e => setClaudeUrl(e.target.value)} 
                          placeholder="https://claude.ai/project/..." 
                          style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                        />
                        {claudeUrl && (
                          <a href={claudeUrl} target="_blank" rel="noreferrer" style={{ padding: '0.4rem 0.8rem', background: '#d97757', color: 'white', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                            Apri
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

            {/* Hub Compiti & Servizi Assegnati (Newsletter, Social, Shooting, ADV...) */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(66, 133, 244, 0.05)', borderRadius: '8px', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, fontSize: '0.92rem', color: '#4285F4' }}>
                  🛠️ Compiti & Servizi Assegnati (Newsletter, Social, ADV, ecc.)
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Assegna i singoli compiti ai collaboratori
                </span>
              </div>

              {/* Preset veloci per aggiungere compiti */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>+ Aggiungi rapido compito/servizio:</span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {PRESET_SERVICES.map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleAddServiceInRubrica(p.key)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista dei compiti/servizi attivi con utenti assegnati */}
              {(() => {
                const { servicesDetails, services } = parseClientServices(selectedClient.sheetData);
                const allActiveServices = Array.from(new Set([...(services || []), ...Object.keys(servicesDetails || {})]));

                if (allActiveServices.length === 0) {
                  return (
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      Nessun compito specifico assegnato. Clicca sui pulsanti in alto per aggiungere compiti (Newsletter, Social, ADV, ecc.).
                    </p>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {allActiveServices.map(svcKey => {
                      const assignedUsers = servicesDetails[svcKey] || [];
                      const preset = PRESET_SERVICES.find(p => p.key === svcKey);
                      const svcTitle = preset ? preset.label : `📌 ${svcKey}`;

                      return (
                        <div key={svcKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.82rem', minWidth: '130px', color: 'var(--text-primary)' }}>{svcTitle}:</strong>
                            
                            {/* Collaboratori assegnati a questo compito */}
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {assignedUsers.map((u, idx) => (
                                <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>{u.name} {u.effort ? <strong style={{ color: 'var(--accent-primary)' }}>({u.effort})</strong> : ''}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUserFromServiceInRubrica(svcKey, u.name)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                                    title={`Rimuovi ${u.name} da ${svcKey}`}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>

                            {/* Dropdown per aggiungere un collaboratore a questo servizio */}
                            <select
                              value=""
                              onChange={e => {
                                if (e.target.value) handleAddUserToServiceInRubrica(svcKey, e.target.value);
                              }}
                              style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}
                            >
                              <option value="">+ Assegna Persona...</option>
                              {members.filter(m => !assignedUsers.some(u => (u.name || '').toUpperCase() === m.name.toUpperCase())).map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Tasto elimina compito */}
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceInRubrica(svcKey)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', padding: '0.2rem' }}
                            title="Elimina questo compito dal cliente"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Zona Pericolosa */}
            <div style={{ background: 'rgba(255,0,0,0.02)', border: '1px solid rgba(255,0,0,0.1)', borderRadius: '6px' }}>
              <div onClick={() => setShowDanger(!showDanger)} style={{ padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--status-danger)' }}>
                <span>{showDanger ? '−' : '+'}</span>
                Zona Pericolosa
              </div>
              
              {showDanger && (
                <div style={{ padding: '0 0.8rem 0.8rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem' }}>Converti in Fornitore/Tool</h4>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Questo non era un vero cliente? Spostalo nella rubrica degli Accessi ed eliminalo dalla lista clienti.</p>
                    <button onClick={handleConvertToSupplier} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Converti in Fornitore
                    </button>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,0,0,0.1)' }} />

                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem' }}>Unisci a un altro cliente</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                        <option value="">-- Seleziona destinazione --</option>
                        {clients.filter(c => c.id !== selectedClient.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button onClick={handleMerge} disabled={!mergeTargetId} style={{ padding: '0.4rem 0.8rem', background: 'var(--status-warning)', color: 'white', borderRadius: '4px', border: 'none', cursor: mergeTargetId ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        Unisci
                      </button>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,0,0,0.1)' }} />
                  
                  <div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem' }}>Elimina Cliente</h4>
                    <button onClick={handleDelete} style={{ padding: '0.4rem 0.8rem', background: 'var(--status-danger)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      Elimina Definitivamente
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* VISTA TABELLA MATRICE CLIENTI & UTENTI */}
      {viewMode === 'table' && (
        <div style={{ background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.2rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Barra Statistiche & Carico di Lavoro per Collaboratore */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>👥</span> Carico di Lavoro / Filtro Collaboratore (clicca per isolare i clienti):
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Totale: <strong>{clients.length}</strong> clienti
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setTableCollaboratorFilter(null)}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  border: tableCollaboratorFilter === null ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: tableCollaboratorFilter === null ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-secondary)',
                  color: tableCollaboratorFilter === null ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: tableCollaboratorFilter === null ? 'bold' : 'normal',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Tutti ({clients.length})
              </button>

              {members.map(m => {
                const count = clients.filter(c => (c.collaborators || []).some(u => u.id === m.id)).length;
                const isSelected = tableCollaboratorFilter === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTableCollaboratorFilter(isSelected ? null : m.id)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '16px',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{m.name}</span>
                    <span style={{
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: isSelected ? '#000' : 'var(--text-secondary)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '10px',
                      fontSize: '0.68rem',
                      fontWeight: 'bold'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setTableCollaboratorFilter(tableCollaboratorFilter === 'UNASSIGNED' ? null : 'UNASSIGNED')}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  border: tableCollaboratorFilter === 'UNASSIGNED' ? '1px solid var(--status-warning)' : '1px solid var(--border-color)',
                  background: tableCollaboratorFilter === 'UNASSIGNED' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-secondary)',
                  color: tableCollaboratorFilter === 'UNASSIGNED' ? 'var(--status-warning)' : 'var(--text-secondary)',
                  fontWeight: tableCollaboratorFilter === 'UNASSIGNED' ? 'bold' : 'normal',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Senza Team ({clients.filter(c => !c.collaborators || c.collaborators.length === 0).length})
              </button>
            </div>
          </div>

          {/* Toolbar Filtri Tabella e Switch Modalità */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <input
                type="text"
                placeholder="🔍 Cerca cliente, collaboratore o compito (es. newsletter, social...)"
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  minWidth: '280px'
                }}
              />

              <select
                value={tableStatusFilter}
                onChange={e => setTableStatusFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem'
                }}
              >
                <option value="ALL">Tutti gli Stati</option>
                <option value="CLIENTE">🟢 Solo Attivi</option>
                <option value="UNA_TANTUM">🟡 Una Tantum</option>
                <option value="PROSPECT">🔵 Prospect</option>
                <option value="OBSOLETO">⚪ Vecchio / Chiuso</option>
                <option value="NASCOSTO">👁️‍🗨️ Nascosti</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer', color: showHiddenAndOld ? 'var(--status-warning)' : 'var(--text-secondary)' }} title="Mostra anche clienti nascosti o conclusi">
                <input 
                  type="checkbox" 
                  checked={showHiddenAndOld} 
                  onChange={e => setShowHiddenAndOld(e.target.checked)} 
                />
                <span>👁️ Mostra Nascosti & Vecchi</span>
              </label>

              {(tableSearch || tableStatusFilter !== 'ALL' || tableCollaboratorFilter || showHiddenAndOld) && (
                <button
                  type="button"
                  onClick={() => {
                    setTableSearch('');
                    setTableStatusFilter('ALL');
                    setTableCollaboratorFilter(null);
                    setShowHiddenAndOld(false);
                  }}
                  style={{
                    padding: '0.35rem 0.6rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--status-danger)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Azzera
                </button>
              )}
            </div>

            {/* Switch Visualizzazione: Matrice vs Elenco */}
            <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-elevated)', padding: '0.2rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setTableMode('matrix')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: tableMode === 'matrix' ? 'var(--bg-secondary)' : 'transparent',
                  color: tableMode === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: tableMode === 'matrix' ? 'bold' : 'normal',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                ▦ Griglia Matrice
              </button>
              <button
                type="button"
                onClick={() => setTableMode('list')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: tableMode === 'list' ? 'var(--bg-secondary)' : 'transparent',
                  color: tableMode === 'list' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: tableMode === 'list' ? 'bold' : 'normal',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                📋 Elenco Dettagliato
              </button>
            </div>
          </div>

          {/* Tabella Dati */}
          <div style={{
            overflowX: 'auto',
            maxHeight: '68vh',
            overflowY: 'auto',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}>
            {tableMode === 'matrix' ? (
              /* GRIGLIA MATRICE: CLIENTE × COLLABORATORI CON COMPITI */
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '2px solid var(--border-color)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 12,
                      background: 'var(--bg-elevated)',
                      minWidth: '240px',
                      boxShadow: '2px 0 5px rgba(0,0,0,0.2)'
                    }}>
                      Cliente ({filteredTableClients.length})
                    </th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', minWidth: '120px', textAlign: 'center' }}>
                      Stato
                    </th>
                    {members.map(m => {
                      const initials = (m.name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      const memberClientCount = clients.filter(c => (c.collaborators || []).some(u => u.id === m.id)).length;
                      return (
                        <th key={m.id} style={{
                          padding: '0.6rem 0.5rem',
                          borderBottom: '2px solid var(--border-color)',
                          textAlign: 'center',
                          minWidth: '120px',
                          borderLeft: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--bg-primary)',
                              color: 'var(--accent-primary)',
                              border: '1px solid var(--border-color)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}>
                              {initials}
                            </span>
                            <span style={{ fontSize: '0.75rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.name}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                              ({memberClientCount} clienti)
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center', minWidth: '85px' }}>
                      Tot. Team
                    </th>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center', minWidth: '80px' }}>
                      Schede
                    </th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center', minWidth: '120px' }}>
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableClients.map((client, idx) => {
                    const activeCardsCount = getClientActiveCardsCount(client.id);
                    const clientColor = client.color || 'var(--accent-primary)';
                    const isEven = idx % 2 === 0;
                    const isEditing = editingClientId === client.id;

                    return (
                      <tr key={client.id} style={{
                        background: isEven ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                        transition: 'background 0.15s ease'
                      }}>
                        {/* Nome Cliente Sticky con Rinomina e Nascondi */}
                        <td style={{
                          padding: '0.55rem 0.8rem',
                          borderBottom: '1px solid var(--border-color)',
                          position: 'sticky',
                          left: 0,
                          zIndex: 5,
                          background: isEven ? 'var(--bg-secondary)' : '#192231',
                          boxShadow: '2px 0 5px rgba(0,0,0,0.15)'
                        }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <input
                                type="text"
                                value={editingClientName}
                                onChange={e => setEditingClientName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenameClient(client.id, editingClientName);
                                  if (e.key === 'Escape') setEditingClientId(null);
                                }}
                                autoFocus
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--accent-primary)',
                                  background: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.82rem',
                                  width: '140px'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameClient(client.id, editingClientName)}
                                style={{ background: 'var(--accent-primary)', border: 'none', color: '#000', borderRadius: '4px', padding: '0.25rem 0.4rem', cursor: 'pointer' }}
                                title="Salva nome"
                              >
                                <FaCheck size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingClientId(null)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                                title="Annulla"
                              >
                                <FaTimes size={11} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clientColor, flexShrink: 0 }} />
                                <span 
                                  onClick={() => openClientDetailsFromTable(client)}
                                  style={{
                                    fontWeight: '600',
                                    color: client.status === 'NASCOSTO' ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    transition: 'color 0.15s ease',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    textDecoration: client.status === 'NASCOSTO' ? 'line-through' : 'none'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                                  onMouseOut={e => e.currentTarget.style.color = client.status === 'NASCOSTO' ? 'var(--text-secondary)' : 'var(--text-primary)'}
                                  title="Clicca per aprire la scheda cliente"
                                >
                                  {client.name}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingClientId(client.id);
                                    setEditingClientName(client.name);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem', opacity: 0.6 }}
                                  title="Rinomina cliente"
                                >
                                  <FaEdit size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleHideClient(client)}
                                  style={{ background: 'transparent', border: 'none', color: client.status === 'NASCOSTO' ? 'var(--status-warning)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem', opacity: 0.7 }}
                                  title={client.status === 'NASCOSTO' ? 'Cliente nascosto - Clicca per mostrare' : 'Nascondi cliente'}
                                >
                                  {client.status === 'NASCOSTO' ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Stato Modificabile al Volo */}
                        <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <select
                            value={client.status || 'CLIENTE'}
                            onChange={e => handleUpdateClientStatus(client.id, e.target.value)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              border: '1px solid var(--border-color)',
                              background: client.status === 'PROSPECT' ? 'rgba(234, 179, 8, 0.15)' : (client.status === 'OBSOLETO' ? 'rgba(255, 255, 255, 0.08)' : (client.status === 'NASCOSTO' ? 'rgba(239, 68, 68, 0.15)' : (client.status === 'UNA_TANTUM' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(34, 197, 94, 0.15)'))),
                              color: client.status === 'PROSPECT' ? 'var(--status-warning)' : (client.status === 'OBSOLETO' ? 'var(--text-secondary)' : (client.status === 'NASCOSTO' ? 'var(--status-danger)' : (client.status === 'UNA_TANTUM' ? '#c084fc' : 'var(--accent-primary)'))),
                              cursor: 'pointer'
                            }}
                          >
                            <option value="CLIENTE">🟢 Attivo</option>
                            <option value="UNA_TANTUM">🟡 1-Spot</option>
                            <option value="PROSPECT">🔵 Prospect</option>
                            <option value="OBSOLETO">⚪ Vecchio</option>
                            <option value="NASCOSTO">👁️‍🗨️ Nascosto</option>
                          </select>
                        </td>

                        {/* Celle Collaboratori con Badge Compiti (Social, Newsletter, ecc.) & Configurazione */}
                        {members.map(m => {
                          const isAssigned = (client.collaborators || []).some(u => u.id === m.id);
                          const userTasks = getMemberServicesForClient(client, m.name);

                          return (
                            <td key={m.id} style={{
                              padding: '0.4rem 0.4rem',
                              borderBottom: '1px solid var(--border-color)',
                              textAlign: 'center',
                              borderLeft: '1px solid rgba(255,255,255,0.04)'
                            }}>
                              {isAssigned ? (
                                <button
                                  type="button"
                                  onClick={() => openTaskModal(client, m)}
                                  title={`Compiti di ${m.name}: ${userTasks.length > 0 ? userTasks.join(', ') : 'Team Generale'}. Clicca per modificare o rimuovere.`}
                                  style={{
                                    padding: '0.25rem 0.45rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--accent-primary)',
                                    background: 'rgba(34, 197, 94, 0.16)',
                                    color: 'var(--accent-primary)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.72rem',
                                    fontWeight: '600',
                                    transition: 'all 0.15s ease',
                                    maxWidth: '110px'
                                  }}
                                >
                                  <span>✓</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {userTasks.length > 0
                                      ? userTasks.map(t => PRESET_SERVICES.find(p => p.key === t)?.short || t).join(', ')
                                      : 'Team'}
                                  </span>
                                  <FaCog size={9} style={{ opacity: 0.7 }} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleAssignmentInTable(client, m.id)}
                                  title={`Assegna ${m.name} e configura i compiti`}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    border: '1px dashed rgba(255,255,255,0.18)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                  }}
                                  onMouseOut={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                                  }}
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Conteggio Collaboratori */}
                        <td style={{ padding: '0.65rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '10px',
                            background: (client.collaborators || []).length > 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            color: (client.collaborators || []).length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)'
                          }}>
                            👥 {(client.collaborators || []).length}
                          </span>
                        </td>

                        {/* Conteggio Schede */}
                        <td style={{ padding: '0.65rem 0.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '10px',
                            background: activeCardsCount > 0 ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
                            color: activeCardsCount > 0 ? '#4285F4' : 'var(--text-secondary)'
                          }}>
                            {activeCardsCount > 0 ? activeCardsCount : '—'}
                          </span>
                        </td>

                        {/* Azioni */}
                        <td style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openClientDetailsFromTable(client)}
                              style={{
                                padding: '0.25rem 0.55rem',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                              title="Modifica cliente e impostazioni"
                            >
                              ✏️ Scheda
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (onOpenNotebook) onOpenNotebook(client); }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                padding: '0.1rem 0.3rem'
                              }}
                              title="Apri Brain IA"
                            >
                              🧠
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTableClients.length === 0 && (
                    <tr>
                      <td colSpan={members.length + 5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Nessun cliente trovato con i filtri attuali.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* MODALITÀ ELENCO DETTAGLIATO CON COMPITI ESPLICITI */
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', minWidth: '180px' }}>Cliente</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', minWidth: '110px' }}>Stato</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', minWidth: '180px' }}>Team Assegnato</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', minWidth: '220px' }}>Compiti & Servizi Assegnati</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center' }}>Schede Attive</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '2px solid var(--border-color)', textAlign: 'center' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableClients.map((client, idx) => {
                    const activeCardsCount = getClientActiveCardsCount(client.id);
                    const clientColor = client.color || 'var(--accent-primary)';
                    const { servicesDetails } = parseClientServices(client.sheetData);
                    const activeServicesEntries = Object.entries(servicesDetails || {}).filter(([_, users]) => users && users.length > 0);
                    const isEditing = editingClientId === client.id;

                    return (
                      <tr key={client.id} style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                        borderBottom: '1px solid var(--border-color)'
                      }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <input
                                type="text"
                                value={editingClientName}
                                onChange={e => setEditingClientName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenameClient(client.id, editingClientName);
                                  if (e.key === 'Escape') setEditingClientId(null);
                                }}
                                autoFocus
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--accent-primary)',
                                  background: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.82rem',
                                  width: '140px'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameClient(client.id, editingClientName)}
                                style={{ background: 'var(--accent-primary)', border: 'none', color: '#000', borderRadius: '4px', padding: '0.25rem 0.4rem', cursor: 'pointer' }}
                              >
                                <FaCheck size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingClientId(null)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
                              >
                                <FaTimes size={11} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: clientColor, flexShrink: 0 }} />
                                <strong 
                                  onClick={() => openClientDetailsFromTable(client)}
                                  style={{
                                    color: client.status === 'NASCOSTO' ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    textDecoration: client.status === 'NASCOSTO' ? 'line-through' : 'none'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                                  onMouseOut={e => e.currentTarget.style.color = client.status === 'NASCOSTO' ? 'var(--text-secondary)' : 'var(--text-primary)'}
                                >
                                  {client.name}
                                </strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingClientId(client.id);
                                    setEditingClientName(client.name);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem', opacity: 0.6 }}
                                  title="Rinomina cliente"
                                >
                                  <FaEdit size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleHideClient(client)}
                                  style={{ background: 'transparent', border: 'none', color: client.status === 'NASCOSTO' ? 'var(--status-warning)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem', opacity: 0.7 }}
                                  title={client.status === 'NASCOSTO' ? 'Ripristina cliente' : 'Nascondi cliente'}
                                >
                                  {client.status === 'NASCOSTO' ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          <select
                            value={client.status || 'CLIENTE'}
                            onChange={e => handleUpdateClientStatus(client.id, e.target.value)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              border: '1px solid var(--border-color)',
                              background: client.status === 'PROSPECT' ? 'rgba(234, 179, 8, 0.15)' : (client.status === 'OBSOLETO' ? 'rgba(255, 255, 255, 0.08)' : (client.status === 'NASCOSTO' ? 'rgba(239, 68, 68, 0.15)' : (client.status === 'UNA_TANTUM' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(34, 197, 94, 0.15)'))),
                              color: client.status === 'PROSPECT' ? 'var(--status-warning)' : (client.status === 'OBSOLETO' ? 'var(--text-secondary)' : (client.status === 'NASCOSTO' ? 'var(--status-danger)' : (client.status === 'UNA_TANTUM' ? '#c084fc' : 'var(--accent-primary)'))),
                              cursor: 'pointer'
                            }}
                          >
                            <option value="CLIENTE">🟢 Attivo</option>
                            <option value="UNA_TANTUM">🟡 1-Spot</option>
                            <option value="PROSPECT">🔵 Prospect</option>
                            <option value="OBSOLETO">⚪ Vecchio</option>
                            <option value="NASCOSTO">👁️‍🗨️ Nascosto</option>
                          </select>
                        </td>

                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {(client.collaborators || []).map(u => (
                              <span key={u.id} style={{
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                color: 'var(--accent-primary)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: '600'
                              }}>
                                {u.name}
                              </span>
                            ))}
                            {(!client.collaborators || client.collaborators.length === 0) && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Nessun collaboratore
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Compiti & Servizi Assegnati */}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {activeServicesEntries.length > 0 ? (
                              activeServicesEntries.map(([svc, users]) => {
                                const preset = PRESET_SERVICES.find(p => p.key === svc);
                                const svcLabel = preset ? preset.short : svc;
                                const userNames = users.map(u => u.name?.split(' ')[0]).join(', ');
                                return (
                                  <span
                                    key={svc}
                                    style={{
                                      background: 'rgba(66, 133, 244, 0.12)',
                                      border: '1px solid rgba(66, 133, 244, 0.25)',
                                      color: '#60a5fa',
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '12px',
                                      fontSize: '0.72rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    <strong>{svcLabel}:</strong> {userNames}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                Nessun compito configurato
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '10px',
                            background: activeCardsCount > 0 ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
                            color: activeCardsCount > 0 ? '#4285F4' : 'var(--text-secondary)'
                          }}>
                            {activeCardsCount > 0 ? `${activeCardsCount} schede` : '—'}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => openClientDetailsFromTable(client)}
                              style={{
                                padding: '0.25rem 0.6rem',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Scheda
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (onOpenNotebook) onOpenNotebook(client); }}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                              title="Apri Brain IA"
                            >
                              🧠
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTableClients.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Nessun cliente trovato con i filtri attuali.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODALE ASSEGNAZIONE & CONFIGURAZIONE COMPITI (NEWSLETTER, SOCIAL, ADV, ECC.) */}
      {taskModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '460px',
            maxWidth: '92%',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  🛠️ Compiti per {taskModalData.member.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                  Cliente: {taskModalData.client.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTaskModalData(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Seleziona gli incarichi specifici (newsletter, social, adv, shooting, ecc.) assegnati a <strong>{taskModalData.member.name}</strong>:
            </div>

            {/* Checklist compiti disponibili */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '280px', overflowY: 'auto' }}>
              {Array.from(new Set([
                ...PRESET_SERVICES.map(p => p.key),
                ...taskModalSelectedKeys
              ])).map(key => {
                const isChecked = taskModalSelectedKeys.includes(key);
                const presetObj = PRESET_SERVICES.find(p => p.key === key);
                const label = presetObj ? presetObj.label : `📌 ${key}`;

                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      background: isChecked ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-primary)',
                      border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: isChecked ? '600' : 'normal',
                      color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setTaskModalSelectedKeys(prev =>
                          prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                        );
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>

            {/* Aggiunta compito personalizzato */}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
              <input
                type="text"
                placeholder="Altro compito (es. Podcast, Eventi...)"
                value={newCustomTaskInput}
                onChange={e => setNewCustomTaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newCustomTaskInput.trim()) {
                      const upper = newCustomTaskInput.trim().toUpperCase();
                      if (!taskModalSelectedKeys.includes(upper)) {
                        setTaskModalSelectedKeys(prev => [...prev, upper]);
                      }
                      setNewCustomTaskInput('');
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newCustomTaskInput.trim()) {
                    const upper = newCustomTaskInput.trim().toUpperCase();
                    if (!taskModalSelectedKeys.includes(upper)) {
                      setTaskModalSelectedKeys(prev => [...prev, upper]);
                    }
                    setNewCustomTaskInput('');
                  }
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                + Aggiungi
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.6rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
              <button
                type="button"
                onClick={() => setTaskModalData(null)}
                style={{
                  padding: '0.45rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => handleSaveMemberTasks(taskModalData.client, taskModalData.member, taskModalSelectedKeys)}
                style={{
                  padding: '0.45rem 1.2rem',
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: '#000',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Salva Compiti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
