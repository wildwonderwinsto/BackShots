import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  X, Mic, Image, RotateCw, Eye, Zap, EyeOff, Activity, 
  Globe, ShieldAlert, Lock, Send, RefreshCw, Binary, 
  ExternalLink, Unlock, Ban, Volume2, Terminal
} from 'lucide-react';
import { socket } from './GlobalOverlay';

// Audio & Image Presets
const PRESETS = {
  audio: [
    { label: 'Discord', url: 'https://www.myinstants.com/media/sounds/discord-notification.mp3' },
    { label: 'Vine Boom', url: 'https://www.myinstants.com/media/sounds/vine-boom.mp3' },
    { label: 'Error', url: 'https://www.myinstants.com/media/sounds/windows-error-sound-effect.mp3' },
    { label: 'Knock', url: 'https://www.myinstants.com/media/sounds/knocking-on-door-sound-effect.mp3' },
    { label: 'Siren', url: 'https://www.myinstants.com/media/sounds/siren-sound-effect.mp3' },
  ],
  images: [
    { label: 'Rick Roll', url: 'https://media.tenor.com/x8v1oNUOmg4AAAAd/rickroll-roll.gif' },
    { label: 'Scary', url: 'https://media.tenor.com/y1v2bM8iMhQAAAAC/scary-face.gif' },
    { label: 'Update', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif' },
    { label: 'Hacked', url: 'https://media.tenor.com/tFpT5xQjXWAAAAAC/hacked-glitch.gif' },
  ]
};

const AdminConsole = ({ onClose }) => {
  // State Management
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [consoleLog, setConsoleLog] = useState([
    '> SYSTEM INITIALIZED',
    '> KERNEL LOADED',
    '> AWAITING COMMANDS...'
  ]);
  const [inputVal, setInputVal] = useState('');
  
  // Feature toggles
  const [chatEnabled, setChatEnabled] = useState(false);
  const [activeEffects, setActiveEffects] = useState({
    matrix: false,
    invert: false,
    glitch: false,
    rotate: false,
    freeze: false
  });
  
  // Effect inputs
  const [ttsText, setTtsText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [alertText, setAlertText] = useState('SYSTEM COMPROMISED');
  const [audioUrl, setAudioUrl] = useState('');

  const logEndRef = useRef(null);

  // Auto-scroll console
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLog]);

  // Socket listeners
  useEffect(() => {
    socket.emit('request_admin_state');
    
    const handleUserList = (u) => setUsers(u);
    const handleStateUpdate = (data) => {
      if (data.chat !== undefined) setChatEnabled(data.chat);
      if (data.effects) setActiveEffects(data.effects);
    };

    socket.on('user_list', handleUserList);
    socket.on('admin_state_update', handleStateUpdate);

    return () => { 
      socket.off('user_list', handleUserList); 
      socket.off('admin_state_update', handleStateUpdate);
    };
  }, []);

  // Logging utility
  const log = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : '>';
    setConsoleLog(prev => [...prev, `[${time}] ${prefix} ${msg}`].slice(-100));
  }, []);

  // User selection
  const toggleSelect = useCallback((id) => {
    if (id === 'all') {
      setSelectedUsers(prev => 
        prev.length === users.length ? [] : users.map(u => u.id)
      );
    } else {
      setSelectedUsers(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    }
  }, [users]);

  // Command execution
  const execute = useCallback((type, payload) => {
    const targets = selectedUsers.length > 0 ? selectedUsers : users.map(u => u.id);
    const targetLabel = selectedUsers.length > 0 
      ? `${selectedUsers.length} target${selectedUsers.length > 1 ? 's' : ''}`
      : 'ALL USERS';

    if (targets.length === 0) {
      log('No targets selected', 'error');
      return;
    }

    // Emit command
    if (selectedUsers.length === 0) {
      // Broadcast to all
      socket.emit('admin_command', { target: 'all', type, payload });
    } else {
      // Send to selected targets
      targets.forEach(tid => {
        socket.emit('admin_command', { target: tid, type, payload });
      });
    }

    // Log with detail
    let detail = '';
    if (typeof payload === 'boolean') {
      detail = payload ? '[ENABLED]' : '[DISABLED]';
    } else if (typeof payload === 'string' && payload) {
      detail = `"${payload.substring(0, 20)}${payload.length > 20 ? '...' : ''}"`;
    }

    log(`${type.toUpperCase()} ${detail} → ${targetLabel}`, 'success');
  }, [selectedUsers, users, log]);

  // Toggle effect helper
  const toggleEffect = useCallback((effect, cmdType) => {
    const newState = !activeEffects[effect];
    setActiveEffects(prev => ({ ...prev, [effect]: newState }));
    execute(cmdType, newState);
  }, [activeEffects, execute]);

  // Reset all effects
  const handleReset = useCallback(() => {
    execute('reset', null);
    setTtsText('');
    setImageUrl('');
    setAlertText('');
    setAudioUrl('');
    setActiveEffects({
      matrix: false,
      invert: false,
      glitch: false,
      rotate: false,
      freeze: false
    });
    log('System reset complete', 'success');
  }, [execute, log]);

  // Chat broadcast
  const broadcastChat = useCallback(() => {
    if (inputVal.trim()) {
      socket.emit('send_chat', { from: 'ADMIN', text: inputVal, isAdmin: true });
      log(`Broadcast: "${inputVal}"`, 'info');
      setInputVal('');
      socket.emit('admin_command', { target: 'all', type: 'open_chat', payload: true });
    }
  }, [inputVal, log]);

  // Toggle global chat
  const toggleGlobalChat = useCallback(() => {
    const newState = !chatEnabled;
    socket.emit('admin_toggle_chat', newState);
    log(`Chat system ${newState ? 'enabled' : 'disabled'}`, 'success');
  }, [chatEnabled, log]);

  const selectedUserData = users.find(u => selectedUsers.length === 1 && u.id === selectedUsers[0]);

  // Action Button Component
  const ActionButton = ({ icon: Icon, label, onClick, isActive, variant = 'default' }) => (
    <button 
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center p-3 sm:p-4 
        border transition-all duration-200 ease-in-out active:scale-95
        ${isActive 
          ? 'bg-red-600 border-red-500 text-white font-bold shadow-lg shadow-red-500/50 scale-[1.02]' 
          : variant === 'danger'
          ? 'bg-zinc-950 border-red-900/50 text-red-400 hover:bg-red-950 hover:border-red-500'
          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white hover:bg-zinc-900'
        }
      `}
    >
      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-2 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center">
        {label}
      </span>
      {isActive && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[10000] bg-black text-white font-mono flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-red-500" />
          <span className="text-sm font-bold tracking-wider text-white hidden sm:inline">
            ADMIN CONSOLE
          </span>
          <span className="text-xs text-zinc-600">v2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600 hidden md:block">
            SESSION ACTIVE
          </span>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-900 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Sidebar - User List */}
        <div className="w-full lg:w-72 h-48 lg:h-auto border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col bg-zinc-950/50 shrink-0">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <span className="text-xs font-bold text-zinc-400">CONNECTED USERS</span>
            <span className="text-xs bg-zinc-900 px-2 py-0.5 rounded text-white border border-zinc-800">
              {users.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {users.map((u) => (
              <div 
                key={u.id} 
                onClick={() => toggleSelect(u.id)}
                className={`
                  p-3 border-b border-zinc-900 cursor-pointer transition-all
                  ${selectedUsers.includes(u.id) 
                    ? 'bg-zinc-900 border-l-2 border-l-red-500' 
                    : 'border-l-2 border-l-transparent hover:bg-zinc-900/50'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${selectedUsers.includes(u.id) ? 'bg-red-500' : 'bg-zinc-700'}`}></div>
                  <span className={`text-xs font-semibold truncate ${selectedUsers.includes(u.id) ? 'text-white' : 'text-zinc-400'}`}>
                    {u.name}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600 pl-4 truncate">
                  {u.page} • {u.device}
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => toggleSelect('all')}
            className="p-3 border-t border-zinc-800 text-xs font-bold hover:bg-zinc-900 text-center text-zinc-500 hover:text-white transition-colors"
          >
            {selectedUsers.length === users.length ? 'DESELECT ALL' : 'SELECT ALL'}
          </button>
        </div>

        {/* Center - Monitor & Controls */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Monitor View */}
          <div className="h-48 lg:h-1/2 border-b border-zinc-800 flex flex-col relative overflow-hidden shrink-0">
            <div className="absolute top-2 left-2 text-[10px] text-zinc-600 font-bold z-10">
              LIVE MONITOR
            </div>
            
            <div className="flex-1 flex items-center justify-center p-8">
              {selectedUserData ? (
                <div className="border border-zinc-800 bg-zinc-950 p-6 max-w-md w-full">
                  <div className="flex flex-col items-center gap-4">
                    {selectedUserData.poster ? (
                      <img 
                        src={selectedUserData.poster} 
                        alt="Activity" 
                        className="w-32 h-48 object-cover rounded border border-zinc-800"
                      />
                    ) : (
                      <Activity className="h-16 w-16 text-zinc-700" />
                    )}
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{selectedUserData.activity}</div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">
                        {selectedUserData.page}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 opacity-50">
                  <Globe className="h-16 w-16 text-zinc-800" />
                  <div className="text-zinc-800 text-xl font-bold tracking-widest">
                    NO TARGET
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Control Grid */}
          <div className="flex-1 bg-zinc-950 p-2 overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-2 mb-3">
              <ActionButton 
                icon={chatEnabled ? Eye : EyeOff} 
                label={chatEnabled ? "CHAT ON" : "CHAT OFF"} 
                onClick={toggleGlobalChat}
                isActive={chatEnabled}
              />
              <ActionButton 
                icon={RotateCw} 
                label="ROTATE" 
                onClick={() => toggleEffect('rotate', 'rotate')} 
                isActive={activeEffects.rotate}
              />
              <ActionButton 
                icon={Zap} 
                label="INVERT" 
                onClick={() => toggleEffect('invert', 'invert')}
                isActive={activeEffects.invert}
              />
              <ActionButton 
                icon={Activity} 
                label="GLITCH" 
                onClick={() => toggleEffect('glitch', 'glitch')}
                isActive={activeEffects.glitch}
              />
              <ActionButton 
                icon={Binary} 
                label="MATRIX" 
                onClick={() => toggleEffect('matrix', 'matrix')}
                isActive={activeEffects.matrix}
              />
              <ActionButton 
                icon={activeEffects.freeze ? Lock : Unlock} 
                label={activeEffects.freeze ? "LOCKED" : "FREEZE"} 
                onClick={() => activeEffects.freeze ? execute('unfreeze', false) : execute('freeze', true)} 
                isActive={activeEffects.freeze}
              />
              <ActionButton 
                icon={RefreshCw} 
                label="RELOAD" 
                onClick={() => execute('reload', null)} 
              />
              <ActionButton 
                icon={ShieldAlert} 
                label="RESET" 
                onClick={handleReset} 
              />
              <ActionButton 
                icon={Ban} 
                label="KICK" 
                onClick={() => execute('kick', null)}
                variant="danger"
              />
            </div>

            {/* Alert Input */}
            <div className="border border-zinc-800 p-2 flex gap-2 bg-zinc-900/50 mb-3">
              <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 hidden sm:block" />
              <input 
                value={alertText}
                onChange={(e) => setAlertText(e.target.value)}
                className="flex-1 bg-transparent text-red-400 font-bold placeholder:text-zinc-700 outline-none text-xs"
                placeholder="ALERT MESSAGE..."
              />
              <button 
                onClick={() => execute('alert', alertText)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1 text-xs transition-colors"
              >
                SEND
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Payloads */}
        <div className="w-full lg:w-80 h-auto lg:h-auto border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col bg-zinc-950/50 shrink-0">
          <div className="p-3 border-b border-zinc-800 bg-zinc-950">
            <span className="text-xs font-bold text-zinc-400">PAYLOAD INJECTION</span>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            
            {/* Audio */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-bold flex items-center gap-2">
                <Volume2 className="h-3 w-3" /> AUDIO
              </label>
              <div className="flex gap-1">
                <input 
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-xs p-2 text-white focus:border-zinc-600 outline-none"
                  placeholder="Audio URL..."
                />
                <button 
                  onClick={() => execute('sound', audioUrl)} 
                  className="bg-zinc-800 hover:bg-zinc-700 px-3 text-xs border border-zinc-700 transition-colors"
                >
                  GO
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {PRESETS.audio.map(p => (
                  <button 
                    key={p.label} 
                    onClick={() => execute('sound', p.url)} 
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[9px] py-1 text-zinc-400 hover:text-white transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TTS */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-bold flex items-center gap-2">
                <Mic className="h-3 w-3" /> TEXT-TO-SPEECH
              </label>
              <div className="flex gap-1">
                <input 
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-xs p-2 text-white focus:border-zinc-600 outline-none"
                  placeholder="Message..."
                />
                <button 
                  onClick={() => execute('tts', ttsText)} 
                  className="bg-zinc-800 hover:bg-zinc-700 px-3 text-xs border border-zinc-700 transition-colors"
                >
                  SAY
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-bold flex items-center gap-2">
                <Image className="h-3 w-3" /> IMAGE OVERLAY
              </label>
              <div className="flex gap-1">
                <input 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-xs p-2 text-white focus:border-zinc-600 outline-none"
                  placeholder="Image URL..."
                />
                <button 
                  onClick={() => execute('image', imageUrl)} 
                  className="bg-zinc-800 hover:bg-zinc-700 px-3 text-xs border border-zinc-700 transition-colors"
                >
                  GO
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {PRESETS.images.map(p => (
                  <button 
                    key={p.label} 
                    onClick={() => execute('image', p.url)} 
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[9px] py-1 text-zinc-400 hover:text-white transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Redirect */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-bold flex items-center gap-2">
                <ExternalLink className="h-3 w-3" /> REDIRECT
              </label>
              <div className="flex gap-1">
                <input 
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-xs p-2 text-white focus:border-zinc-600 outline-none"
                  placeholder="URL..."
                />
                <button 
                  onClick={() => execute('redirect', redirectUrl)} 
                  className="bg-zinc-800 hover:bg-zinc-700 px-3 text-xs border border-zinc-700 transition-colors"
                >
                  GO
                </button>
              </div>
            </div>
          </div>

          {/* Console Log */}
          <div className="h-32 border-t border-zinc-800 flex flex-col bg-black">
            <div className="p-2 border-b border-zinc-900 text-[10px] text-zinc-600 font-bold">
              CONSOLE
            </div>
            <div className="flex-1 p-2 overflow-y-auto text-[10px] text-zinc-500 space-y-1">
              {consoleLog.map((line, i) => (
                <div key={i} className="hover:text-zinc-400 transition-colors font-mono">
                  {line}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Command Line */}
      <div className="h-12 border-t border-zinc-800 bg-zinc-950 flex items-center px-4 gap-3 shrink-0">
        <span className="text-red-500 font-bold text-sm hidden sm:inline">$</span>
        <input 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && broadcastChat()}
          className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-zinc-700"
          placeholder="broadcast message..."
        />
        <button onClick={broadcastChat} className="text-zinc-600 hover:text-white transition-colors">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AdminConsole;