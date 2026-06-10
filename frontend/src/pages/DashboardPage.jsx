import React, { useState } from 'react';
import MapCanvas from '../components/MapCanvas';
import LiveSidebar from '../components/LiveSidebar';

export default function DashboardPage() {
  const [selectedConvoy, setSelectedConvoy] = useState(null);

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      gap: '16px',
      padding: '16px',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }} className="flex-col lg:flex-row">
      {/* Telemetry Grid & Control Sidebar */}
      <div style={{
        width: '380px',
        flexShrink: 0,
        height: '100%',
        overflow: 'hidden',
      }} className="w-full lg:w-[380px]">
        <LiveSidebar
          selectedConvoy={selectedConvoy}
          onSelectConvoy={setSelectedConvoy}
        />
      </div>

      {/* Global Maritime Risk Map Canvas */}
      <div style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        minHeight: '350px',
      }}>
        <MapCanvas
          selectedConvoy={selectedConvoy}
          onSelectConvoy={setSelectedConvoy}
        />
      </div>
    </div>
  );
}
