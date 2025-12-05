import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, MessageSquare, Send, Fingerprint } from 'lucide-react';
import { io } from 'socket.io-client';
import AdminConsole from './AdminConsole';

// Socket connection - shared with AdminConsole
export const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});

const GlobalOverlay = () => {
  // Identity State
  const [name, setName] = useState('');
  const [showNameModal, setShowNameModal] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Chat State
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Effect States - synced with admin commands
  const [bouncers, setBouncers] = useState([]);
  const [screenRot, setScreenRot] = useState(0);
  const [glitchMode, setGlitchMode] = useState(false);
  const [invertMode, setInvertMode] = useState(false);
  const [matrixMode, setMatrixMode] = useState(false);
  const [freezeMode, setFreezeMode] = useState(false);
  const [fullScreenAlert, setFullScreenAlert] = useState(null);

  // Refs
  const requestRef = useRef(0);
  const chatBottomRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  // Load saved username
  useEffect(() => {
    const saved = localStorage.getItem('winston_username');
    if (saved) {
      setName(saved);
      setShowNameModal(false);
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  // Apply global DOM effects - WORKS IN FULLSCREEN
  useEffect(() => {
    const rootElement = document.documentElement;
    const bodyElement = document.body;
    
    // Apply to both html and body for fullscreen compatibility
    [rootElement, bodyElement].forEach(el => {
      el.style.transition = 'transform 0.5s ease, filter 0.5s ease';
      el.style.transform = `rotate(${screenRot}deg)`;
      el.style.filter = invertMode ? 'invert(1) hue-rotate(180deg)' : 'none';
    });

    // Freeze interaction
    if (freezeMode) {
      bodyElement.style.pointerEvents = 'none';
      bodyElement.style.userSelect = 'none';
      bodyElement.style.cursor = 'not-allowed';
      rootElement.style.pointerEvents = 'none';
      rootElement.style.userSelect = 'none';
    } else {
      bodyElement.style.pointerEvents = '';
      bodyElement.style.userSelect = '';
      bodyElement.style.cursor = '';
      rootElement.style.pointerEvents = '';
      rootElement.style.userSelect = '';
    }

    return () => {
      [rootElement, bodyElement].forEach(el => {
        el.style.transform = '';
        el.style.filter = '';
        el.style.pointerEvents = '';
        el.style.userSelect = '';
        el.style.cursor = '';
      });
    };
  }, [screenRot, invertMode, freezeMode]);

  // Matrix rain effect
  useEffect(() => {
    if (!matrixMode || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const chars = '01WINSTONSTREAMS';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [matrixMode]);

  // Socket event handlers
  useEffect(() => {
    // Report identity and activity
    const reportIdentity = () => {
      if (name) {
        socket.emit('set_identity', name);
        socket.emit('update_activity', {
          device: navigator.platform || 'Unknown',
          page: window.location.pathname === '/' ? 'Home' : window.location.pathname
        });
      }
    };

    reportIdentity();

    // Chat status
    socket.on('chat_status', (status) => {
      setIsChatEnabled(status);
      if (!status) setChatOpen(false);
    });

    // Execute commands from admin
    socket.on('execute_command', (cmd) => {
      console.log('Received command:', cmd);

      // Audio playback
      if (cmd.type === 'sound') {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(cmd.payload);
        audioRef.current.play().catch(e => console.error('Audio error:', e));
      }

      // Text-to-speech
      if (cmd.type === 'tts') {
        const utterance = new SpeechSynthesisUtterance(cmd.payload);
        utterance.pitch = 0.8;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }

      // Image/Video overlay
      if (cmd.type === 'image' || cmd.type === 'video') {
        const newBouncer = {
          id: Date.now() + Math.random(),
          type: cmd.type,
          content: cmd.payload,
          x: Math.random() * (window.innerWidth - 250),
          y: Math.random() * (window.innerHeight - 250),
          dx: (Math.random() - 0.5) * 8,
          dy: (Math.random() - 0.5) * 8
        };
        setBouncers(prev => [...prev, newBouncer]);
      }

      // Visual effects
      if (cmd.type === 'rotate') setScreenRot(cmd.payload ? 180 : 0);
      if (cmd.type === 'invert') setInvertMode(cmd.payload);
      if (cmd.type === 'matrix') setMatrixMode(cmd.payload);
      if (cmd.type === 'glitch') setGlitchMode(cmd.payload);
      if (cmd.type === 'freeze') setFreezeMode(true);
      if (cmd.type === 'unfreeze') setFreezeMode(false);

      // Navigation
      if (cmd.type === 'redirect') window.location.href = cmd.payload;
      if (cmd.type === 'kick') window.location.replace('https://www.google.com');
      if (cmd.type === 'reload') window.location.reload();

      // Alert
      if (cmd.type === 'alert') setFullScreenAlert(cmd.payload);

      // Chat control
      if (cmd.type === 'open_chat') setChatOpen(true);

      // Reset
      if (cmd.type === 'reset') {
        setScreenRot(0);
        setInvertMode(false);
        setMatrixMode(false);
        setFreezeMode(false);
        setGlitchMode(false);
        setBouncers([]);
        setFullScreenAlert(null);
        if (audioRef.current) audioRef.current.pause();
        window.speechSynthesis.cancel();
      }
    });

    // Chat messages
    socket.on('receive_chat', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!chatOpen) setUnreadCount(prev => prev + 1);
    });

    // Admin console access
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'Period') {
        e.preventDefault();
        setShowAdminLogin(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      socket.off('chat_status');
      socket.off('execute_command');
      socket.off('receive_chat');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [name, chatOpen]);

  // Bouncing animation
  const animate = useCallback(() => {
    setBouncers(prev => {
      return prev.map(b => {
        let { x, y, dx, dy } = b;
        
        const maxX = window.innerWidth - 250;
        const maxY = window.innerHeight - 250;
        
        if (x + dx > maxX || x + dx < 0) dx = -dx;
        if (y + dy > maxY || y + dy < 0) dy = -dy;

        return { ...b, x: x + dx, y: y + dy, dx, dy };
      });
    });
  }, []);

  useEffect(() => {
    if (bouncers.length > 0) {
      requestRef.current = requestAnimationFrame(function tick() {
        animate();
        requestRef.current = requestAnimationFrame(tick);
      });
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [bouncers.length, animate]);

  // Handle identity submission
  const handleSetIdentity = (e) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('winston_username', name.trim());
      socket.emit('set_identity', name.trim());
      setShowNameModal(false);
    }
  };

  // Send chat message
  const sendChat = () => {
    if (chatInput.trim() && name) {
      socket.emit('send_chat', {
        from: name,
        text: chatInput.trim(),
        isAdmin: false
      });
      setChatInput('');
    }
  };

  // Admin login
  const handleAdminLogin = (e) => {
    e.preventDefault();
    const passInput = document.getElementById('admin-pass');
    const password = passInput ? passInput.value : '';
    if (password === 'winston') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      socket.emit('admin_authenticated');
    } else {
      alert('ACCESS DENIED');
    }
  };

  // Render admin console
  if (isAdmin) {
    return <AdminConsole onClose={() => setIsAdmin(false)} />;
  }

  return (
    <>
      {/* Global Effects Layer - Works in fullscreen */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{ 
          zIndex: 2147483646,
          isolation: 'isolate'
        }}
      >
        {/* Glitch effect */}
        {glitchMode && (
          <div 
            className="absolute inset-0 animate-pulse pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.1) 0px, transparent 2px, rgba(0,255,0,0.1) 4px, transparent 6px)',
              mixBlendMode: 'difference'
            }}
          />
        )}

        {/* Matrix rain */}
        {matrixMode && (
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 opacity-80"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </div>

      {/* Full screen alert - Highest z-index */}
      {fullScreenAlert && (
        <div 
          className="fixed inset-0 bg-red-600 flex items-center justify-center p-12 text-center"
          style={{ zIndex: 2147483647 }}
        >
          <div className="animate-pulse">
            <h1 className="text-9xl font-black text-black mb-8">⚠ WARNING ⚠</h1>
            <p className="text-4xl font-bold text-white font-mono">{fullScreenAlert}</p>
            <button 
              onClick={() => setFullScreenAlert(null)}
              className="mt-8 px-6 py-3 bg-black text-white font-bold text-xl hover:bg-zinc-900"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Bouncing objects */}
      <div 
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 2147483645 }}
      >
        {bouncers.map(b => (
          <div 
            key={b.id}
            className="absolute shadow-2xl border-4 border-white/30 rounded-lg overflow-hidden"
            style={{ 
              transform: `translate(${b.x}px, ${b.y}px)`,
              width: '250px',
              minHeight: '250px'
            }}
          >
            {b.type === 'image' && (
              <img src={b.content} alt="" className="w-full h-full object-cover" />
            )}
            {b.type === 'video' && (
              <video src={b.content} autoPlay loop muted className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>

      {/* Identity Modal */}
      {showNameModal && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          style={{ zIndex: 2147483647 }}
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-900/90 ring-1 ring-white/10 shadow-2xl p-8">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-8 rounded-2xl bg-black/50 p-4 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
                <Fingerprint className="h-10 w-10 text-white" />
              </div>
              
              <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 mb-2">
                IDENTITY REQUIRED
              </h2>
              <p className="text-zinc-500 font-medium tracking-[0.2em] uppercase text-xs mb-10">
                ESTABLISH SECURE UPLINK
              </p>

              <div className="w-full space-y-4">
                <div className="group relative">
                  <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-red-500/50 to-blue-500/50 opacity-0 transition duration-500 group-focus-within:opacity-100 blur" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetIdentity(e)}
                    placeholder="ENTER CODENAME"
                    className="relative w-full bg-black text-white placeholder:text-zinc-700 font-mono text-sm px-6 py-4 rounded-xl border border-zinc-800 focus:outline-none focus:border-transparent transition-all shadow-inner text-center tracking-widest uppercase"
                    autoFocus
                  />
                </div>
                
                <button 
                  onClick={handleSetIdentity}
                  className="w-full py-4 rounded-xl bg-white text-black font-bold tracking-widest uppercase text-xs hover:bg-zinc-200 transition-transform active:scale-95 shadow-lg shadow-white/5"
                >
                  Initialize Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center"
          style={{ zIndex: 2147483647 }}
        >
          <div className="w-full max-w-sm bg-zinc-900 border border-red-900 p-8 rounded shadow-2xl">
            <h1 className="text-red-600 font-mono text-xl mb-4 text-center tracking-widest uppercase">
              Console Access
            </h1>
            <div>
              <input 
                id="admin-pass" 
                type="password" 
                className="w-full bg-black border border-zinc-700 text-red-500 font-mono p-2 mb-4 focus:outline-none focus:border-red-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin(e)}
                autoFocus 
              />
              <button 
                onClick={handleAdminLogin}
                className="w-full bg-red-900/20 text-red-500 border border-red-900 py-2 hover:bg-red-900/40 font-mono transition-colors"
              >
                AUTHENTICATE
              </button>
            </div>
            <button 
              onClick={() => setShowAdminLogin(false)} 
              className="mt-4 text-zinc-600 text-xs w-full text-center hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      {!showNameModal && isChatEnabled && (
        <div 
          className="fixed bottom-4 right-4 transition-all duration-300 ease-in-out"
          style={{ 
            zIndex: 2147483646,
            width: chatOpen ? '320px' : '56px',
            height: chatOpen ? '400px' : '56px'
          }}
        >
          {chatOpen ? (
            <div className="w-full h-full bg-black/95 backdrop-blur-md border border-zinc-800 rounded-xl flex flex-col shadow-2xl overflow-hidden">
              {/* Chat header */}
              <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
                <span className="font-bold text-sm text-zinc-300 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Global Chat
                </span>
                <button onClick={() => { setChatOpen(false); setUnreadCount(0); }}>
                  <X className="h-4 w-4 text-zinc-500 hover:text-white" />
                </button>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col ${m.from === name ? 'items-end' : 'items-start'}`}
                  >
                    <span className={`text-[10px] ${m.isAdmin ? 'text-red-500 font-bold' : 'text-zinc-500'}`}>
                      {m.isAdmin ? '★ ADMIN' : m.from}
                    </span>
                    <div className={`px-3 py-1.5 rounded-lg text-sm max-w-[80%] break-words ${
                      m.isAdmin ? 'bg-red-900/50 text-red-100 border border-red-800' :
                      m.from === name ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-200'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2 shrink-0">
                <input 
                  className="flex-1 bg-black text-sm text-white px-3 py-2 rounded-lg focus:outline-none border border-zinc-800 focus:border-zinc-600 transition-colors"
                  placeholder="Type..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                />
                <button 
                  onClick={sendChat}
                  className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  <Send className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => { setChatOpen(true); setUnreadCount(0); }}
              className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-800 shadow-xl relative"
            >
              <MessageSquare className="h-6 w-6 text-white" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </div>
              )}
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default GlobalOverlay;