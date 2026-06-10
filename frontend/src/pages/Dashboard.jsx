import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLiveState } from '../context/LiveStateContext';
import MapCanvas from '../components/MapCanvas';
import LiveSidebar from '../components/LiveSidebar';
import AiAlertModal from '../components/AiAlertModal';
import { LogOut, User, Navigation, Shield, Compass } from 'lucide-react';

const Dashboard = () => {
  const { user, logout, loading } = useAuth();
  const { latestAlert, setLatestAlert } = useLiveState();
  const navigate = useNavigate();
  
  const [selectedConvoy, setSelectedConvoy] = useState(null);

  // Authenticated route protection
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="h-screen w-screen bg-[#060813] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-spin">
          <Navigation className="h-6 w-6 text-white" />
        </div>
        <p className="font-mono text-xs text-indigo-400 tracking-wider animate-pulse">CONNECTING OPERATIONAL CHANNEL...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#060813] text-slate-100 overflow-hidden font-sans">
      
      {/* Top Banner Navigation */}
      <header className="h-14 bg-[#0a0f1d] border-b border-slate-900 px-6 flex items-center justify-between select-none">
        
        {/* Left: Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Compass className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold font-mono tracking-wider text-xs">RELIEFROUTE COMMAND DESK</span>
            <span className="text-[9px] font-bold text-slate-500 font-mono">SYSTEM RELEASE v1.0.0</span>
          </div>
        </div>

        {/* Center: System Alerts Status */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1">
            <Shield className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[10px] font-semibold font-mono text-slate-300">DISASTER LOGISTICS OVERWATCH ENABLED</span>
          </div>
        </div>

        {/* Right: User telemetry and Logout */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-right">
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-bold font-mono text-slate-300">{user.email}</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Response Operator</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <User className="h-4.5 w-4.5" />
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            title="Secure Logout"
            className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/40 text-red-400 hover:bg-red-900 hover:text-white transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </header>

      {/* Main operational workspace */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden relative">
        
        {/* Left Side: Sidebar */}
        <LiveSidebar 
          selectedConvoy={selectedConvoy}
          onSelectConvoy={setSelectedConvoy}
        />

        {/* Right Side: Map Canvas */}
        <div className="flex-1 h-full relative min-h-[300px]">
          <MapCanvas 
            selectedConvoy={selectedConvoy}
            onSelectConvoy={setSelectedConvoy}
          />
        </div>

      </main>

      {/* AI alert modal slide-in */}
      <AiAlertModal 
        alert={latestAlert}
        onClose={() => setLatestAlert(null)}
      />

    </div>
  );
};

export default Dashboard;
