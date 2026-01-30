import React, { useState, useEffect, useRef } from 'react';
import { Board } from './components/Board';
import { GameState, Piece, PlayerColor, Position, User, GameMode, Room, Language, Difficulty } from './types';
import { INITIAL_BOARD_SETUP } from './constants';
import { isValidMove, checkWinner, getAIMove, isInCheck } from './services/gameLogic';
import { playSelectSound, playMoveSound, playCheckSound, playWinSound, initAudio } from './services/audioService';
import { Users, RotateCcw, Flag, Trophy, UserCircle, Globe, Cpu, ChevronLeft, LogIn, Languages, Image as ImageIcon, Plus, X, LogOut, DoorOpen, BookOpen } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import { RulesModal } from './components/RulesModal';
import { useSocket } from './hooks/useSocket';
import { supabase } from './services/supabaseClient';

const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Milo",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Zoe"
];

const App: React.FC = () => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [savedUsers, setSavedUsers] = useState<User[]>([]);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [onlineTab, setOnlineTab] = useState<'lobby' | 'rankings'>('lobby');
  const [language, setLanguage] = useState<Language>('zh');
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [isLoading, setIsLoading] = useState(false);

  // Login State
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', avatar: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    pieces: INITIAL_BOARD_SETUP(),
    turn: PlayerColor.RED,
    selectedPieceId: null,
    lastMove: null,
    winner: null,
    history: [],
  });

  const [undoRequest, setUndoRequest] = useState<{ requester: PlayerColor } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Translations helper
  const t = TRANSLATIONS[language];

  // --- Socket Integration ---
  const { socket, isConnected } = useSocket(currentUser?.username);
  const [remoteRoom, setRemoteRoom] = useState<any>(null); // Full room object from server
  const [joinRoomId, setJoinRoomId] = useState(''); // Moved from conditional
  const [availableRooms, setAvailableRooms] = useState<any[]>([]); // List of rooms

  const myColor = remoteRoom?.players.find((p: any) => p.username === currentUser?.username)?.color as PlayerColor | undefined;
  const opponent = remoteRoom?.players.find((p: any) => p.username !== currentUser?.username);
  const [disconnectedOpponent, setDisconnectedOpponent] = useState<string | null>(null);

  // --- Effects ---
  // Auto-rejoin on reconnection if we were in a room
  useEffect(() => {
    if (isConnected && remoteRoom && socket && currentUser) {
      console.log("Socket reconnected, attempting to re-join room:", remoteRoom.id);
      socket.emit('join_room', { roomId: remoteRoom.id, username: currentUser.username }, (res: any) => {
        if (res.success) {
          console.log("Re-joined room successfully");
          setRemoteRoom(res.room); // Update room state in case it changed
        } else {
          console.error("Failed to re-join room:", res.error);
          // If room error (e.g. doesn't exist), maybe clear remoteRoom?
          // setRemoteRoom(null); 
        }
      });
    }
  }, [isConnected]);

  useEffect(() => {
    // Load all saved users
    const usersJson = localStorage.getItem('xiangqi_users_v2');
    if (usersJson) {
      setSavedUsers(JSON.parse(usersJson));
    }
  }, []);

  // AI Turn
  useEffect(() => {
    if (gameMode === GameMode.AI && gameState.turn === PlayerColor.GREEN && !gameState.winner) {
      const timer = setTimeout(() => {
        const move = getAIMove(gameState.pieces, PlayerColor.GREEN, aiDifficulty);
        if (move) {
          executeMove(move.from, move.to);
        } else {
          // AI can't move - Red wins
          const winner = PlayerColor.RED;
          setGameState(prev => ({ ...prev, winner }));
          handleGameEnd(winner);
          setTimeout(() => playWinSound(), 500);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.turn, gameMode, gameState.winner, aiDifficulty]);

  // Socket Events
  useEffect(() => {
    if (!socket) return;

    socket.on('player_joined', (data: any) => {
      setRemoteRoom(data.room);
      console.log('Player joined:', data.newPlayer);
    });

    socket.on('game_start', (data: any) => {
      console.log('Game Started!', data.players);
      setRemoteRoom((prev: any) => ({ ...prev, players: data.players }));
      // Reset Board
      setGameState({
        pieces: INITIAL_BOARD_SETUP(),
        turn: PlayerColor.RED,
        selectedPieceId: null,
        lastMove: null,
        winner: null,
        endReason: undefined,
        history: [],
      });
      playSelectSound();
    });

    socket.on('opponent_move', (data: any) => {
      console.log('Opponent moved', data.move);
      playMoveSound();
      setGameState(prev => ({
        ...prev,
        pieces: data.gameState.pieces,
        turn: data.gameState.turn,
        lastMove: data.move,
        history: data.gameState.history
      }));

      if (isInCheck(data.gameState.pieces, data.gameState.turn)) {
        playCheckSound();
      }
    });

    socket.on('game_ended', (data: any) => {
      setGameState(prev => ({
        ...prev,
        winner: data.winner as PlayerColor,
        endReason: data.reason
      }));
      playWinSound();
    });

    socket.on('player_left', () => {
      // If the game ended due to opponent leaving, we already handled it via game_ended
      // So we can arguably do nothing specific here, or just show a small toast.
      // We definitely should NOT reset the game mode, because that hides the "You Win" modal.
      console.log("Opponent left room");
    });

    socket.on('player_disconnected', ({ username }: { username: string }) => {
      console.log(`Player ${username} disconnected`);
      setDisconnectedOpponent(username);
    });

    socket.on('player_reconnected', ({ username }: { username: string }) => {
      console.log(`Player ${username} reconnected`);
      setDisconnectedOpponent(null);
    });

    socket.on('game_state_sync', ({ gameState: syncedState }: { gameState: GameState }) => {
      console.log("Synced game state from server");
      setGameState(prev => ({
        ...prev,
        ...syncedState
      }));
    });

    return () => {
      socket.off('player_joined');
      socket.off('game_start');
      socket.off('opponent_move');
      socket.off('game_ended');
      socket.off('player_left');
      socket.off('player_disconnected');
      socket.off('player_reconnected');
      socket.off('game_state_sync');
    };
  }, [socket]);

  // --- Helpers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        alert("Image file is too large. Please select an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLoginForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username) return;

    initAudio();

    const avatarUrl = loginForm.avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

    // Supabase Integration
    if (supabase) {
      try {
        // Check if user exists
        const { data: existingUser, error } = await supabase
          .from('xiangqi_users')
          .select('*')
          .eq('username', loginForm.username)
          .single();

        if (existingUser) {
          // Login
          const user: User = {
            username: existingUser.username,
            avatarUrl: existingUser.avatar_url,
            stats: {
              wins: existingUser.wins,
              losses: existingUser.losses,
              rank: existingUser.rank
            }
          };
          setCurrentUser(user);
          // Update local storage for convenience
          updateLocalStorage(user);
        } else {
          // Register
          const { error: insertError } = await supabase
            .from('xiangqi_users')
            .insert([{
              username: loginForm.username,
              avatar_url: avatarUrl,
              wins: 0,
              losses: 0,
              rank: 1200,
              created_at: new Date().toISOString()
            }]);

          if (!insertError) {
            const user: User = {
              username: loginForm.username,
              avatarUrl: avatarUrl,
              stats: { wins: 0, losses: 0, rank: 1200 }
            };
            setCurrentUser(user);
            updateLocalStorage(user);
          } else {
            console.error("Supabase insert error:", insertError);
            fallbackLogin(loginForm.username, avatarUrl);
          }
        }
      } catch (err) {
        console.error("Supabase login error:", err);
        fallbackLogin(loginForm.username, avatarUrl);
      }
    } else {
      fallbackLogin(loginForm.username, avatarUrl);
    }

    // Reset form
    setLoginForm({ username: '', avatar: '' });
    setIsCreatingUser(false);
  };

  const updateLocalStorage = (user: User) => {
    const existingIndex = savedUsers.findIndex(u => u.username === user.username);
    let updatedUsers = [...savedUsers];
    if (existingIndex >= 0) {
      updatedUsers[existingIndex] = user;
    } else {
      updatedUsers.push(user);
    }
    setSavedUsers(updatedUsers);
    localStorage.setItem('xiangqi_users_v2', JSON.stringify(updatedUsers));
  };

  const fallbackLogin = (username: string, avatarUrl: string) => {
    const newUser: User = {
      username: username,
      avatarUrl: avatarUrl,
      stats: { wins: 0, losses: 0, rank: 1200 }
    };
    const existingIndex = savedUsers.findIndex(u => u.username === newUser.username);
    let updatedUsers = [...savedUsers];
    if (existingIndex >= 0) {
      updatedUsers[existingIndex] = {
        ...updatedUsers[existingIndex],
        avatarUrl: avatarUrl || updatedUsers[existingIndex].avatarUrl
      };
      setCurrentUser(updatedUsers[existingIndex]);
    } else {
      updatedUsers.push(newUser);
      setCurrentUser(newUser);
    }
    setSavedUsers(updatedUsers);
    localStorage.setItem('xiangqi_users_v2', JSON.stringify(updatedUsers));
  };

  const handleQuickLogin = (user: User) => {
    initAudio();
    setCurrentUser(user);
  };

  const removeUser = (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    const updated = savedUsers.filter(u => u.username !== username);
    setSavedUsers(updated);
    localStorage.setItem('xiangqi_users_v2', JSON.stringify(updated));
  }

  const handleLogout = () => {
    setCurrentUser(null);
    setGameMode(null);
    setRoom(null);
    // Do not clear localStorage, just session state
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const handleGameEnd = (winner: PlayerColor) => {
    if (!currentUser) return;

    let pointsToAdd = 0;
    let isWin = false;
    let isLoss = false;

    if (gameMode === GameMode.AI) {
      if (winner === PlayerColor.RED) {
        // AI: Win = 50 pts
        pointsToAdd = 50;
        isWin = true;
      }
    } else if (gameMode === GameMode.ONLINE) {
      if (winner === PlayerColor.RED) {
        // Online: Win = 100 pts
        pointsToAdd = 100;
        isWin = true;
      } else {
        // Online: Loss = 50 pts
        pointsToAdd = 50;
        isLoss = true;
      }
    }
    // Local Mode: No points

    if (pointsToAdd > 0 || isWin || isLoss) {
      const newStats = {
        ...currentUser.stats,
        wins: currentUser.stats.wins + (isWin ? 1 : 0),
        losses: currentUser.stats.losses + (isLoss ? 1 : 0),
        rank: currentUser.stats.rank + pointsToAdd
      };

      const updatedUser = { ...currentUser, stats: newStats };
      const updatedList = savedUsers.map(u => u.username === updatedUser.username ? updatedUser : u);

      setSavedUsers(updatedList);
      localStorage.setItem('xiangqi_users_v2', JSON.stringify(updatedList));
      setCurrentUser(updatedUser);
    }
  };

  const executeMove = (from: Position, to: Position) => {
    playMoveSound();

    setGameState(prev => {
      const newPieces = prev.pieces.filter(p => !(p.position.x === to.x && p.position.y === to.y)).map(p => {
        if (p.position.x === from.x && p.position.y === from.y) {
          return { ...p, position: to };
        }
        return p;
      });

      const winner = checkWinner(newPieces);
      const nextTurn = prev.turn === PlayerColor.RED ? PlayerColor.GREEN : PlayerColor.RED;

      const newGameState = {
        ...prev,
        pieces: newPieces,
        turn: nextTurn,
        selectedPieceId: null,
        lastMove: { from, to },
        winner,
        history: [...prev.history, prev.pieces],
      };

      // Socket Emit
      if (gameMode === GameMode.ONLINE && socket && remoteRoom) {
        socket.emit('make_move', {
          roomId: remoteRoom.id,
          move: { from, to },
          gameState: newGameState
        });

        if (winner) {
          socket.emit('game_over', { roomId: remoteRoom.id, winner, reason: 'checkmate' });
        }
      }

      if (winner) {
        handleGameEnd(winner);
        setTimeout(() => playWinSound(), 500);
      } else if (isInCheck(newPieces, nextTurn)) {
        setTimeout(() => playCheckSound(), 200);
      }

      return newGameState;
    });
  };

  const onPieceClick = (piece: Piece) => {
    if (gameState.winner) return;

    // Online Restriction
    if (gameMode === GameMode.ONLINE && myColor && piece.color !== myColor && piece.color === gameState.turn) {
      return; // Cannot select opponent's pieces to move
    }
    if (gameMode === GameMode.ONLINE && myColor && gameState.turn !== myColor) {
      return; // Not my turn
    }

    if (piece.color === gameState.turn) {
      playSelectSound();
      setGameState(prev => ({ ...prev, selectedPieceId: piece.id }));
      return;
    }

    if (gameState.selectedPieceId) {
      const selectedPiece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
      if (selectedPiece && isValidMove(selectedPiece, piece.position, gameState.pieces)) {
        executeMove(selectedPiece.position, piece.position);
      }
    }
  };

  const onSquareClick = (pos: Position) => {
    if (gameState.winner || !gameState.selectedPieceId) return;

    const selectedPiece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
    if (selectedPiece && isValidMove(selectedPiece, pos, gameState.pieces)) {
      executeMove(selectedPiece.position, pos);
    } else {
      setGameState(prev => ({ ...prev, selectedPieceId: null }));
    }
  };

  const requestUndo = () => {
    if (gameState.history.length === 0) return;

    if (gameMode === GameMode.AI) {
      if (gameState.turn === PlayerColor.RED) {
        undo(); // Undo AI
        setTimeout(undo, 100); // Undo Player
      }
    } else {
      const waitingPlayer = gameState.turn === PlayerColor.RED ? PlayerColor.GREEN : PlayerColor.RED;
      setUndoRequest({ requester: waitingPlayer });
    }
  };

  const undo = () => {
    setGameState(prev => {
      if (prev.history.length === 0) return prev;
      const previousPieces = prev.history[prev.history.length - 1];
      const newHistory = prev.history.slice(0, -1);
      return {
        ...prev,
        pieces: previousPieces,
        turn: prev.turn === PlayerColor.RED ? PlayerColor.GREEN : PlayerColor.RED,
        lastMove: null,
        winner: null,
        history: newHistory,
      };
    });
    setUndoRequest(null);
  };

  const resetGame = () => {
    setGameState({
      pieces: INITIAL_BOARD_SETUP(),
      turn: PlayerColor.RED,
      selectedPieceId: null,
      lastMove: null,
      winner: null,
      history: [],
    });
    setUndoRequest(null);
  };

  const createRoom = () => {
    if (socket) {
      setIsLoading(true);
      socket.emit('create_room', { username: currentUser?.username }, (res: any) => {
        setIsLoading(false);
        if (res.success) {
          setRemoteRoom(res.room);
          resetGame();
        }
      });
    }
  };

  const joinRoom = (id: string) => {
    if (socket && id) {
      socket.emit('join_room', { roomId: id, username: currentUser?.username }, (res: any) => {
        if (res.success) {
          setRemoteRoom(res.room);
          resetGame();
        } else {
          alert(res.error || 'Failed to join');
        }
      });
    }
  };

  const handleExitRequest = () => {
    if (gameMode === GameMode.ONLINE && !gameState.winner) {
      setShowExitConfirm(true);
    } else {
      exitGame();
    }
  };

  const exitGame = () => {
    if (gameMode === GameMode.ONLINE) {
      if (socket && remoteRoom) {
        socket.emit('leave_room', { roomId: remoteRoom.id });
      }
      setRemoteRoom(null);
      setRoom(null);
      setDisconnectedOpponent(null);
      // Also reset game state to initial to avoid showing old state next time
      setGameState({
        pieces: INITIAL_BOARD_SETUP(),
        turn: PlayerColor.RED,
        selectedPieceId: null,
        lastMove: null,
        winner: null,
        history: [],
      });
    } else {
      setGameMode(null);
    }
    setShowExitConfirm(false);
  };

  // Re-declare listener for rooms_update inside the effect where we need it or keep separate?
  // The original effect lines 63-72 was replaced in the first chunk, better verify we didn't lose it.
  // Wait, I replaced lines 59-72 in the first chunk but I put the `rooms_update` effect back? 
  // Checking the replacement...
  // "Auto-rejoin on reconnection..." I did NOT put the rooms_update effect back in the first chunk! 
  // I need to add it here or in another chunk.

  useEffect(() => {
    if (socket) {
      socket.on('rooms_update', (rooms: any[]) => {
        setAvailableRooms(rooms);
      });
      return () => {
        socket.off('rooms_update');
      };
    }
  }, [socket]);

  const confirmExit = () => {
    // Record loss logic for online games if exiting early
    if (gameMode === GameMode.ONLINE && !gameState.winner && currentUser) {
      const pointsToAdd = 50; // Online Loss = 50 pts
      const newStats = {
        ...currentUser.stats,
        losses: currentUser.stats.losses + 1,
        rank: currentUser.stats.rank + pointsToAdd
      };
      const updatedUser = { ...currentUser, stats: newStats };
      const updatedList = savedUsers.map(u => u.username === updatedUser.username ? updatedUser : u);
      setSavedUsers(updatedList);
      localStorage.setItem('xiangqi_users_v2', JSON.stringify(updatedList));
      setCurrentUser(updatedUser);
    }
    exitGame();
  };

  // --- Components ---

  const LanguageSwitcher = ({ className }: { className?: string }) => (
    <button
      onClick={toggleLanguage}
      className={className || "absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-sm hover:bg-white transition-colors text-stone-700 text-xs font-medium border border-stone-200"}
    >
      <Languages size={14} />
      {t.switchLang}
    </button>
  );

  // 1. Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] bg-stone-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <LanguageSwitcher />

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md border border-stone-200 z-10 animate-fade-in">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-2">{t.appTitle}</h1>
            <p className="text-stone-500">{t.appSubtitle}</p>
          </div>

          {/* Saved Users List */}
          {!isCreatingUser && savedUsers.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Recent Players</div>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {savedUsers.map((user) => (
                  <div
                    key={user.username}
                    onClick={() => handleQuickLogin(user)}
                    className="relative flex flex-col items-center p-3 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50 cursor-pointer transition-all group"
                  >
                    <button
                      onClick={(e) => removeUser(e, user.username)}
                      className="absolute top-1 right-1 p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md mb-2 bg-stone-100">
                      <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-stone-800 text-sm truncate w-full text-center">{user.username}</span>
                    <span className="text-xs text-stone-500">{t.rank}: {user.stats.rank}</span>
                  </div>
                ))}

                {/* Add Button as a card */}
                <button
                  onClick={() => setIsCreatingUser(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 cursor-pointer transition-all h-full min-h-[120px]"
                >
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm font-medium text-stone-500">Add Account</span>
                </button>
              </div>
            </div>
          )}

          {/* Create User Form */}
          {(isCreatingUser || savedUsers.length === 0) && (
            <form onSubmit={handleLogin} className="space-y-6">
              {savedUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="text-sm text-stone-500 flex items-center gap-1 hover:text-stone-800 mb-2"
                >
                  <ChevronLeft size={16} /> Back to accounts
                </button>
              )}

              <div className="flex flex-col items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition-all overflow-hidden relative group"
                >
                  {loginForm.avatar ? (
                    <img src={loginForm.avatar} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <ImageIcon className="text-stone-400 group-hover:text-amber-500" />
                      <span className="text-xs text-stone-400 mt-1">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">{t.username}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                  placeholder={t.enterName}
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-stone-800 text-amber-50 py-3 rounded-lg font-bold hover:bg-stone-900 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn size={20} /> {t.startPlaying}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 2. Main Menu
  if (!gameMode) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f5f5] flex flex-col">
        {/* Rules Modal */}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} language={language} />

        <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-200">
              <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-stone-800 text-sm leading-tight">{currentUser.username}</h2>
              <div className="text-xs text-stone-500">{t.rank}: {currentUser.stats.rank}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Rules Button */}
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-full text-amber-600 text-xs hover:bg-amber-100 transition-colors"
            >
              <BookOpen size={14} /> <span>{t.howToPlay}</span>
            </button>
            <LanguageSwitcher className="flex items-center gap-1 bg-stone-50 px-2.5 py-1.5 rounded-full text-stone-600 text-xs hover:bg-stone-100 transition-colors" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-50 px-2.5 py-1.5 rounded-full text-red-500 text-xs hover:bg-red-100 transition-colors"
            >
              <LogOut size={14} /> <span>{t.logout}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto w-full">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-serif text-stone-800">{t.chooseMode}</h1>
            <p className="text-stone-500 text-sm md:text-base">{t.selectModeDescription}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
            <button
              onClick={() => { setGameMode(GameMode.LOCAL); resetGame(); initAudio(); }}
              className="group bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-lg hover:border-amber-400 transition-all flex flex-row md:flex-col items-center gap-4 text-left md:text-center"
            >
              <div className="p-4 bg-amber-50 rounded-full text-amber-600 group-hover:bg-amber-100 transition-colors shrink-0">
                <Users size={32} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-stone-800">{t.passAndPlay}</h3>
                <p className="text-xs md:text-sm text-stone-500 mt-1">{t.passAndPlayDesc}</p>
              </div>
            </button>

            <button
              onClick={() => { setGameMode(GameMode.AI); resetGame(); initAudio(); }}
              className="group bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-lg hover:border-emerald-400 transition-all flex flex-row md:flex-col items-center gap-4 text-left md:text-center"
            >
              <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 group-hover:bg-emerald-100 transition-colors shrink-0">
                <Cpu size={32} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-stone-800">{t.versusAI}</h3>
                <p className="text-xs md:text-sm text-stone-500 mt-1">{t.versusAIDesc}</p>
              </div>
            </button>

            <button
              onClick={() => { setGameMode(GameMode.ONLINE); setOnlineTab('lobby'); initAudio(); }}
              className="group bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200 hover:shadow-lg hover:border-blue-400 transition-all flex flex-row md:flex-col items-center gap-4 text-left md:text-center"
            >
              <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-100 transition-colors shrink-0">
                <Globe size={32} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-stone-800">{t.onlineMatch}</h3>
                <p className="text-xs md:text-sm text-stone-500 mt-1">{t.onlineMatchDesc}</p>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 3. Online Lobby UI
  if (gameMode === GameMode.ONLINE && !remoteRoom) { // Use remoteRoom to determine if in game

    return (
      <div className="min-h-[100dvh] bg-[#f5f5f5] flex flex-col">
        <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <button onClick={() => setGameMode(null)} className="flex items-center gap-2 text-stone-600 hover:text-stone-900">
            <ChevronLeft size={20} /> {t.back}
          </button>
          <span className="font-bold text-lg">{t.onlineLobby}</span>
          <div className="w-8" />
        </header>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 max-w-2xl mx-auto">
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-stone-800 mb-2">{t.createRoom}</h2>
                <button
                  onClick={createRoom}
                  disabled={isLoading}
                  className={`bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-amber-200 transition-all transform ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    t.createRoom
                  )}
                </button>
              </div>

              <div className="relative flex items-center gap-4">
                <div className="h-px bg-stone-200 flex-1" />
                <span className="text-stone-400 text-sm">OR</span>
                <div className="h-px bg-stone-200 flex-1" />
              </div>

              {/* Manual Join */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Room ID manually"
                    className="flex-1 px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    value={joinRoomId}
                    onChange={e => setJoinRoomId(e.target.value)}
                  />
                  <button
                    onClick={() => joinRoom(joinRoomId)}
                    className="bg-stone-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-stone-900 transition-colors"
                  >
                    {t.join}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-stone-800">{t.availableRooms}</h3>
                <button
                  onClick={() => socket?.emit('get_rooms')}
                  className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:border-stone-400 bg-white transition-all active:scale-95"
                >
                  <RotateCcw size={14} /> Refresh
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {availableRooms.length === 0 ? (
                  <div className="text-center text-stone-500 py-8">No active rooms found. Create one!</div>
                ) : (
                  availableRooms.map((r: any) => {
                    const isMyRoom = r.playerNames?.includes(currentUser?.username);
                    const isFull = r.players >= 2 && !isMyRoom;

                    return (
                      <div key={r.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-amber-300 transition-colors bg-stone-50">
                        <div>
                          <div className="font-bold text-stone-800">{r.name || `Room ${r.id}`}</div>
                          <div className="text-xs text-stone-500">{t.host}: {r.id}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${r.players >= 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {r.players >= 2 ? (isMyRoom ? t.rejoin : 'Full') : t.waiting}
                          </span>
                          {!isFull && (
                            <button
                              onClick={() => joinRoom(r.id)}
                              className="text-amber-600 hover:underline text-sm font-bold"
                            >
                              {isMyRoom ? t.rejoin : t.join}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 4. Game Screen (Mobile Optimized)
  return (
    <div className="h-[100dvh] bg-stone-100 flex flex-col md:flex-row items-center justify-center p-0 md:p-4 gap-0 md:gap-8 overflow-hidden relative">

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} language={language} />

      {/* Undo Consent Modal */}
      {undoRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in">
            <h3 className="text-xl font-bold mb-2">{t.undoRequest}</h3>
            <p className="text-stone-600 mb-6">
              {t.undoRequestMsg(undoRequest.requester === PlayerColor.RED ? t.red : t.green)}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setUndoRequest(null)}
                className="flex-1 py-3 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50"
              >
                {t.deny}
              </button>
              <button
                onClick={undo}
                className="flex-1 py-3 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 shadow-md"
              >
                {t.allow}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Room Confirm Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-bounce-in">
            <h3 className="text-xl font-bold mb-2 text-red-600">{t.exitRoom}</h3>
            <p className="text-stone-600 mb-6 font-medium">
              {t.exitConfirm}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 shadow-md"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnected Overlay */}
      {disconnectedOpponent && !gameState.winner && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Globe size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">{t.opponentDisconnected}</h3>
            <p className="text-stone-500 mb-6">{t.waitingForReconnect}</p>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-amber-500 w-1/3 animate-[shimmer_1.5s_infinite] rounded-full" />
              {/* Fallback animation if custom keyframe missing */}
              <div className="h-full bg-amber-500 w-full animate-pulse origin-left scale-x-50" />
            </div>
          </div>
        </div>
      )}

      {/* Winner Overlay */}
      {gameState.winner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full">
            <Trophy size={64} className="mx-auto text-yellow-500 mb-4 animate-bounce" />
            <h2 className="text-3xl font-serif font-bold text-stone-800 mb-2">
              {gameState.endReason === 'opponent_left'
                ? t.opponentLeftWin
                : (gameState.winner === PlayerColor.RED ? t.red : t.green) + " " + t.wins
              }
            </h2>
            {gameState.endReason === 'opponent_left' && (
              <p className="text-stone-500 mb-4">You have won the game.</p>
            )}
            <div className="flex flex-col gap-3 justify-center mt-6">
              <button
                onClick={resetGame}
                className="w-full py-3 bg-stone-800 text-amber-50 rounded-lg hover:bg-stone-900 font-bold"
              >
                {t.playAgain}
              </button>
              <button
                onClick={exitGame}
                className="w-full py-3 text-stone-600 hover:text-stone-900"
              >
                {t.backToMenu}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Mobile Layout: Top Bar (Opponent) --- */}
      <div className="flex md:hidden w-full bg-white p-3 shadow-sm z-10 justify-between items-center h-16 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-bold border border-emerald-200">
            {gameMode === GameMode.AI ? <Cpu size={18} /> : <UserCircle size={18} />}
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm text-stone-800">
              {gameMode === GameMode.AI
                ? (
                  <div className="flex flex-col">
                    <div className="font-bold text-sm text-stone-800">{t.zenAI}</div>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as Difficulty)}
                      className="mt-0.5 p-0 text-xs border border-emerald-200 rounded bg-white text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[100px]"
                    >
                      <option value={Difficulty.EASY}>Easy</option>
                      <option value={Difficulty.MEDIUM}>Medium</option>
                      <option value={Difficulty.HARD}>Hard</option>
                    </select>
                  </div>
                )
                : (
                  <div className="font-bold text-sm text-stone-800">
                    {gameMode === GameMode.ONLINE
                      ? (opponent ? opponent.username : t.waitingForOpponent)
                      : t.green
                    }
                  </div>
                )
              }
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">
              {(gameMode === GameMode.ONLINE ? gameState.turn !== myColor : gameState.turn === PlayerColor.GREEN) ? t.thinking : t.waiting}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRules(true)} className="p-2 text-amber-600 bg-amber-50 rounded-full">
            <BookOpen size={20} />
          </button>
          <button onClick={handleExitRequest} className="p-2 text-stone-400">
            <ChevronLeft size={24} />
          </button>
        </div>
      </div>

      {/* --- Desktop Left Sidebar --- */}
      <div className="hidden md:flex flex-col gap-4 w-64 justify-between h-full max-h-[800px]">
        {/* Opponent Card */}
        <div className={`bg-white p-4 rounded-xl shadow-sm border-2 transition-colors ${(gameMode === GameMode.ONLINE ? gameState.turn !== myColor : gameState.turn === PlayerColor.GREEN) ? 'border-emerald-500 bg-emerald-50' : 'border-transparent'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-bold border-2 border-emerald-200">
              {gameMode === GameMode.AI ? <Cpu size={24} /> : <UserCircle size={24} />}
            </div>
            <div className="flex-1">
              <div className="font-bold text-emerald-900">
                {gameMode === GameMode.AI
                  ? t.zenAI
                  : (gameMode === GameMode.ONLINE
                    ? (opponent ? opponent.username : t.waitingForOpponent)
                    : t.green
                  )
                }
              </div>
              <div className="text-xs text-emerald-600">
                {(gameMode === GameMode.ONLINE ? gameState.turn !== myColor : gameState.turn === PlayerColor.GREEN) ? t.thinking : t.waitingForOpponent}
              </div>
            </div>
          </div>
          {gameMode === GameMode.AI && (
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value as Difficulty)}
              className="w-full mt-2 p-1 text-xs border border-emerald-200 rounded bg-white text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={Difficulty.EASY}>Level: Easy</option>
              <option value={Difficulty.MEDIUM}>Level: Medium</option>
              <option value={Difficulty.HARD}>Level: Hard</option>
            </select>
          )}
        </div>

        {/* Room ID Display (Desktop) */}
        {gameMode === GameMode.ONLINE && remoteRoom && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
            <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Room ID</div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl font-mono font-bold text-stone-900">{remoteRoom.id}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(remoteRoom.id);
                // Optional: Show toast or feedback
              }}
              className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded-full font-bold transition-colors"
            >
              Copy ID
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowRules(true)} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:bg-stone-50 text-amber-700 transition-colors">
            <BookOpen size={18} /> {t.howToPlay}
          </button>
          <button onClick={requestUndo} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:bg-stone-50 text-stone-700 transition-colors">
            <RotateCcw size={18} /> {t.requestUndo}
          </button>
          <button onClick={handleExitRequest} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm hover:bg-stone-50 text-red-600 transition-colors">
            {gameMode === GameMode.ONLINE ? <DoorOpen size={18} /> : <LogOut size={18} />}
            {gameMode === GameMode.ONLINE ? t.exitRoom : t.surrender}
          </button>
        </div>

        {/* Player Card */}
        <div className={`bg-white p-4 rounded-xl shadow-sm border-2 transition-colors ${(gameMode === GameMode.ONLINE ? gameState.turn === myColor : gameState.turn === PlayerColor.RED) ? 'border-red-500 bg-red-50' : 'border-transparent'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-red-200">
              <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-red-900">{currentUser.username} ({t.you})</div>
              <div className="text-xs text-red-600">
                {(gameMode === GameMode.ONLINE ? gameState.turn === myColor : gameState.turn === PlayerColor.RED) ? t.yourTurn : t.waiting}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Board Area (Center) --- */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-2 md:p-0 relative overflow-hidden bg-stone-200 md:bg-transparent">
        {/* Responsive Container: Max width constraint, but fits height */}
        <div className="w-full max-w-[600px] h-full max-h-[85vh] md:max-h-[800px] aspect-[9/10] flex items-center justify-center">
          <Board
            gameState={gameState}
            onPieceClick={onPieceClick}
            onSquareClick={onSquareClick}
            isMyTurn={gameMode === GameMode.LOCAL || (gameMode === GameMode.AI && gameState.turn === PlayerColor.RED) || (gameMode === GameMode.ONLINE && gameState.turn === myColor)}
            isFlipped={gameMode === GameMode.ONLINE && myColor === PlayerColor.GREEN}
          />
        </div>
      </div>

      {/* --- Mobile Bottom Bar (Player & Controls) --- */}
      <div className="flex md:hidden w-full bg-white border-t border-stone-200 pb-safe shrink-0 flex-col">
        {/* Player Info Row */}
        <div className={`flex items-center justify-between p-3 border-b border-stone-100 ${gameState.turn === PlayerColor.RED ? 'bg-amber-50' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
              <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm text-stone-800">{currentUser.username}</div>
              <div className="text-[10px] text-stone-500">
                {gameState.turn === PlayerColor.RED ? <span className="text-red-600 font-bold">{t.yourTurn}</span> : t.waiting}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={requestUndo}
              className="p-2 bg-stone-100 rounded-full text-stone-600 active:scale-95 transition-transform"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={handleExitRequest}
              className="p-2 bg-stone-100 rounded-full text-red-500 active:scale-95 transition-transform"
            >
              {gameMode === GameMode.ONLINE ? <DoorOpen size={20} /> : <LogOut size={20} />}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default App;