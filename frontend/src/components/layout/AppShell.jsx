import React from 'react';
import { Outlet } from 'react-router-dom';
import CommandBar from './CommandBar';
import NavSidebar from './NavSidebar';
import AiAlertModal from '../AiAlertModal';
import { useLiveState } from '../../context/LiveStateContext';

export default function AppShell() {
  const { latestAlert, setLatestAlert } = useLiveState();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
    }}>
      <CommandBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NavSidebar />
        <main style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          background: 'var(--bg-base)',
        }}>
          <Outlet />
        </main>
      </div>
      <AiAlertModal alert={latestAlert} onClose={() => setLatestAlert(null)} />
    </div>
  );
}
