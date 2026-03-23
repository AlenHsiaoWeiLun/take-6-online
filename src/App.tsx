import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './store/GameContext';
import { GameTable } from './components/GameTable';
import { PlayerSeat } from './components/PlayerSeat';
import { PlayerHand } from './components/PlayerHand';
import { soundManager } from './services/sound';
import confetti from 'canvas-confetti';
import { BullHeadIcon, EmoteIcon, SettingsIcon, LogOutIcon, LogInIcon, RefreshCwIcon, MaximizeIcon, MinimizeIcon, UserIcon, CameraIcon } from './components/Icons';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { state, startGame, resetGame, sendEmote, user, login, signOut, isAuthReady, updateProfile, setMaxPlayers } = useGame();
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Profile Form State
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  useEffect(() => {
    if (user) {
      setNewName(user.displayName || '');
      setNewAvatar(user.photoURL || '');
    }
  }, [user]);

  useEffect(() => {
    if (state.lastAnimationEvent && isSoundEnabled) {
      const { type } = state.lastAnimationEvent;
      if (type === 'PLACE_CARD') soundManager.play('place');
      if (type === 'TAKE_ROW') {
        soundManager.play('take');
        setTimeout(() => soundManager.play('score'), 200);
      }
      if (type === 'REVEAL') soundManager.play('reveal');
    }
  }, [state.lastAnimationEvent, isSoundEnabled]);

  useEffect(() => {
    if (state.state === 'GAME_END' && isSoundEnabled) {
      soundManager.play('win');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FBBF24', '#F87171', '#60A5FA', '#34D399']
      });
    }
  }, [state.state, isSoundEnabled]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const emotes = ['shock', 'laugh', 'angry', 'cool'];
  const finalStandings = state.players
    .map((player, index) => {
      if (!player) return null;
      return {
        player,
        index,
        score: state.scores[index],
        isWinner: !!state.winners?.includes(index)
      };
    })
    .filter((entry): entry is { player: NonNullable<typeof state.players[number]>; index: number; score: number; isWinner: boolean } => entry !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index);

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden font-sans selection:bg-indigo-500/30 flex flex-col">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]"></div>
      </div>

      {/* Header / HUD */}
      <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-3">
          <BullHeadIcon className="w-7 h-7 text-red-500" />
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter leading-none">
              TAKE <span className="text-red-500">6</span>
            </h1>
            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Multiplayer Battle</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <MinimizeIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white flex items-center justify-center min-w-[36px] min-h-[36px]"
            >
              {user ? (
                <img src={user.photoURL || ''} className="w-7 h-7 rounded-full border border-slate-700 object-cover" alt="Profile" />
              ) : (
                <SettingsIcon className="w-5 h-5" />
              )}
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-[60]"
                >
                  <div className="px-3 py-2 border-b border-slate-800 mb-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Account</div>
                    {user ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={user.photoURL || ''} className="w-6 h-6 rounded-full" alt="" />
                          <div className="text-xs font-bold truncate max-w-[100px]">{user.displayName}</div>
                        </div>
                        <button 
                          onClick={() => { setShowProfileModal(true); setShowSettings(false); }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                        >
                          EDIT
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Not logged in</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        Sound Effects
                      </div>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${isSoundEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isSoundEnabled ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </button>

                    {user ? (
                      <button
                        onClick={() => { signOut(); setShowSettings(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <LogOutIcon className="w-4 h-4" />
                        Logout
                      </button>
                    ) : (
                      <button
                        onClick={() => { login(); setShowSettings(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-lg transition-colors"
                      >
                        <LogInIcon className="w-4 h-4" />
                        Login with Google
                      </button>
                    )}

                    <button
                      onClick={() => { resetGame(); setShowSettings(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <RefreshCwIcon className="w-4 h-4" />
                      Restart Game
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {state.state === 'GAME_END' && (
            <button
              onClick={resetGame}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all"
            >
              RESET
            </button>
          )}
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* Sidebar for Players */}
        <aside className="w-full lg:w-64 h-auto lg:h-full bg-slate-950/80 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shadow-2xl z-20 shrink-0">
          <div className="hidden lg:block p-4 border-b border-slate-800/50 bg-gradient-to-b from-slate-900/50 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
                <BullHeadIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tighter leading-none">TAKE 6!</h1>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Digital Edition</p>
              </div>
            </div>
          </div>

          <div className="flex-none lg:flex-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto p-2 sm:p-4 gap-2 sm:space-y-3 custom-scrollbar items-center lg:items-stretch">
            <div className="hidden lg:block text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 px-2 shrink-0">Players Table</div>
            {Array.from({ length: state.maxPlayers }).map((_, i) => (
              <div key={i} className="shrink-0"><PlayerSeat seatIndex={i} /></div>
            ))}
          </div>

          {state.state !== 'LOBBY' && (
            <div className="hidden lg:block p-4 bg-slate-900/30 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                <span>Game Progress</span>
                <span className="text-indigo-400">Round {state.round}</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(state.round / 10) * 100}%` }}
                  className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                />
              </div>
            </div>
          )}
        </aside>

        {/* Game Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-indigo-500/5 min-h-0">
          {state.state === 'LOBBY' ? (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 min-h-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full max-h-full bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-slate-700 p-8 sm:p-16 shadow-2xl relative overflow-hidden flex flex-col justify-center"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-indigo-500 to-emerald-500" />
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                
                <div className="relative z-10 text-center">
                  <motion.div 
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="inline-block p-4 bg-slate-950 rounded-full border-2 border-slate-800 mb-4 sm:mb-8 shadow-2xl"
                  >
                    <BullHeadIcon className="w-12 h-12 sm:w-20 sm:h-20 text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]" />
                  </motion.div>
                  
                  <h2 className="text-3xl sm:text-6xl font-black mb-2 sm:mb-4 tracking-tighter text-slate-100 italic leading-none">
                    TAKE <span className="text-red-500">6!</span>
                  </h2>
                  
                  <p className="text-slate-400 text-sm sm:text-base font-medium mb-6 sm:mb-10 max-w-sm mx-auto leading-relaxed">
                    The classic game of bullheads and bad luck. Join a seat to begin the carnage.
                  </p>
                  
                  <div className="flex flex-col items-center gap-4 mb-6 sm:mb-10">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Game Settings</div>
                    {!isAuthReady ? (
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Initializing Google Login...
                      </div>
                    ) : user ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200">
                        <img src={user.photoURL || ''} className="h-8 w-8 rounded-full border border-emerald-400/40 object-cover" alt="" />
                        <span>Signed in as {user.displayName}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => login()}
                        className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-5 py-2.5 text-sm font-black text-indigo-200 transition-colors hover:bg-indigo-500/20"
                      >
                        Login with Google
                      </button>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">PLAYERS:</span>
                      <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                        {[2, 4, 6, 8, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => setMaxPlayers(n)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                              state.maxPlayers === n ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startGame}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-500/20 transition-all border-b-4 border-indigo-800 active:border-b-0"
                    >
                      START BATTLE
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center p-2 sm:p-6 min-h-0 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center min-h-0">
                  <GameTable />
                </div>
              </div>
              <div className="h-[25%] min-h-[120px] max-h-[224px] flex-shrink-0 relative z-50">
                <PlayerHand />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Emote Picker */}
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {showEmotePicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl flex gap-2 mb-4"
            >
              {emotes.map(e => (
                <button
                  key={e}
                  onClick={() => {
                    sendEmote(e);
                    setShowEmotePicker(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <EmoteIcon type={e} className="w-8 h-8" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowEmotePicker(!showEmotePicker)}
          className="w-14 h-14 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center shadow-2xl hover:bg-slate-800 transition-colors"
        >
          <EmoteIcon type="laugh" className="w-6 h-6 text-white/60" />
        </motion.button>
      </div>

      {/* Game End Overlay */}
      <AnimatePresence>
        {state.state === 'GAME_END' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.18),_transparent_40%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.98))] border border-slate-700 p-8 sm:p-12 rounded-[3rem] shadow-2xl max-w-3xl w-full text-center"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-amber-300 to-indigo-500" />
              <div className="absolute -top-12 right-10 h-32 w-32 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-100">
                  Final Standings
                </div>
                <h2 className="text-4xl sm:text-5xl font-black mb-2 tracking-tighter italic">GAME OVER</h2>
                <p className="text-sm text-slate-400 mb-8">Lower bullheads rank higher. The cleanest run wins.</p>
              </div>
              
              <div className="space-y-3 mb-10">
                {finalStandings.map(({ player, index, score, isWinner }, rank) => {
                  const rankLabel = `#${rank + 1}`;
                  const medalStyles = [
                    {
                      row: 'border-yellow-300/50 bg-yellow-400/10 shadow-[0_0_30px_rgba(250,204,21,0.16)]',
                      badge: 'border-yellow-200/50 bg-yellow-300/20 text-yellow-50',
                      avatar: 'border-yellow-200/40',
                      score: 'border-yellow-200/40 bg-yellow-300/10',
                      label: 'Champion'
                    },
                    {
                      row: 'border-slate-300/40 bg-slate-200/10 shadow-[0_0_24px_rgba(226,232,240,0.12)]',
                      badge: 'border-slate-200/40 bg-slate-200/15 text-slate-100',
                      avatar: 'border-slate-200/30',
                      score: 'border-slate-200/30 bg-slate-200/10',
                      label: 'Silver'
                    },
                    {
                      row: 'border-orange-300/40 bg-orange-400/10 shadow-[0_0_24px_rgba(251,146,60,0.12)]',
                      badge: 'border-orange-200/40 bg-orange-300/15 text-orange-50',
                      avatar: 'border-orange-200/30',
                      score: 'border-orange-200/30 bg-orange-300/10',
                      label: 'Bronze'
                    }
                  ][rank] || null;
                  const rowClassName = medalStyles?.row || 'border-white/10 bg-white/5';
                  const badgeClassName = medalStyles?.badge || 'border-white/10 bg-white/5 text-slate-300';
                  const avatarClassName = medalStyles?.avatar || 'border-white/20';
                  const scoreClassName = medalStyles?.score || 'border-white/10 bg-slate-950/50';

                  return (
                    <div
                      key={index}
                      className={`relative flex items-center justify-between rounded-[1.75rem] border px-4 py-4 sm:px-5 ${rowClassName}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-black ${badgeClassName}`}>
                          {rankLabel}
                        </div>
                        <img src={player.avatar} className={`w-12 h-12 rounded-2xl border-2 object-cover ${avatarClassName}`} alt="" />
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="font-black text-white">{player.name}</div>
                            {isWinner && (
                              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-100">
                                Winner
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                            {medalStyles?.label || 'Final Score'}
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2 ${scoreClassName}`}>
                        <BullHeadIcon className="w-5 h-5 text-red-500" />
                        <span className="text-2xl font-black font-mono text-white">{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={resetGame}
                className="bg-white text-slate-950 px-12 py-4 rounded-2xl font-black text-lg hover:bg-indigo-400 hover:text-white transition-all shadow-xl shadow-indigo-500/20"
              >
                PLAY AGAIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black tracking-tight">Edit Profile</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-slate-500 hover:text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <img src={newAvatar} className="w-24 h-24 rounded-full border-4 border-indigo-500/30 shadow-2xl" alt="" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <CameraIcon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Avatar URL</label>
                    <input 
                      type="text" 
                      value={newAvatar}
                      onChange={(e) => setNewAvatar(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Display Name</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Your Name"
                  />
                </div>

                <button
                  onClick={async () => {
                    await updateProfile(newName, newAvatar);
                    setShowProfileModal(false);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black transition-all shadow-lg shadow-indigo-500/20"
                >
                  SAVE CHANGES
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
