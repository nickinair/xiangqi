module.exports = (io, supabase) => {
    const rooms = new Map(); // Store room state in memory for now

    // Helper to get public room list
    const getPublicRooms = () => {
        return Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            players: r.players.length,
            playerNames: r.players.map(p => p.username)
        }));
    };

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Send existing rooms to new user
        socket.emit('rooms_update', getPublicRooms());

        socket.on('get_rooms', () => {
            socket.emit('rooms_update', getPublicRooms());
        });

        // --- Room Management ---

        socket.on('create_room', ({ username, roomName }, callback) => {
            const roomId = Math.random().toString(36).substring(7);
            const room = {
                id: roomId,
                name: roomName || `${username}'s Room`,
                players: [{ id: socket.id, username, color: 'red', connected: true }],
                spectators: [],
                gameState: null // Will be initialized when 2nd player joins or game starts
            };
            rooms.set(roomId, room);
            socket.join(roomId);

            console.log(`Room created: ${roomId} by ${username}`);
            io.emit('rooms_update', getPublicRooms()); // Broadcast update
            callback({ success: true, roomId, room });
        });

        socket.on('join_room', ({ roomId, username }, callback) => {
            const room = rooms.get(roomId);
            if (!room) {
                return callback({ success: false, error: 'Room not found' });
            }

            // Check for reconnection
            const existingPlayerIndex = room.players.findIndex(p => p.username === username);
            if (existingPlayerIndex !== -1) {
                const player = room.players[existingPlayerIndex];

                // If previously marked as disconnected, cancel the timeout
                if (player.disconnectTimeout) {
                    clearTimeout(player.disconnectTimeout);
                    player.disconnectTimeout = null;
                }

                player.id = socket.id; // Update socket ID
                player.connected = true;
                socket.join(roomId);

                console.log(`User ${username} reconnected to room ${roomId}`);

                // Notify room
                io.to(roomId).emit('player_reconnected', { username });

                // Send success with current room state
                callback({ success: true, room });

                // If game was running, re-send state
                if (room.gameState) {
                    socket.emit('game_state_sync', {
                        gameState: room.gameState,
                        players: room.players
                    });
                }
                return;
            }

            if (room.players.length >= 2) {
                return callback({ success: false, error: 'Room is full' });
            }

            // Determine color based on existing player
            const color = room.players[0].color === 'red' ? 'green' : 'red';
            const player = { id: socket.id, username, color, connected: true };
            room.players.push(player);
            socket.join(roomId);

            // Notify everyone in room
            io.to(roomId).emit('player_joined', { room, newPlayer: player });
            io.emit('rooms_update', getPublicRooms()); // Broadcast update to lobby

            console.log(`User ${username} joined room ${roomId}`);
            callback({ success: true, room });

            // If 2 players, start game? 
            if (room.players.length === 2 && !room.gameState) {
                io.to(roomId).emit('game_start', {
                    players: room.players,
                    currentTurn: 'red'
                });
            }
        });

        socket.on('start_game', ({ roomId }) => {
            // Explicit start if needed
        });

        // --- Game Play ---

        socket.on('make_move', ({ roomId, move, gameState }) => {
            // Broadcast move to other player
            socket.to(roomId).emit('opponent_move', { move, gameState });

            // Update server state (lightweight sync)
            const room = rooms.get(roomId);
            if (room) {
                room.gameState = gameState;
            }
        });

        socket.on('game_over', async ({ roomId, winner, reason }) => {
            io.to(roomId).emit('game_ended', { winner, reason });

            // --- Leaderboard Update (Supabase) ---
            if (supabase) {
                const room = rooms.get(roomId);
                if (room && room.players.length === 2 && winner) {
                    const winnerPlayer = room.players.find(p => p.color === winner);
                    const loserPlayer = room.players.find(p => p.color !== winner);

                    if (winnerPlayer && loserPlayer) {
                        await updateStats(supabase, winnerPlayer.username, true);
                        await updateStats(supabase, loserPlayer.username, false);
                    }
                }
            }
        });

        socket.on('leave_room', ({ roomId }) => {
            handleLeave(socket, roomId, true); // Explicit leave
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Find rooms user was in and handle leave/disconnect
            rooms.forEach((room, roomId) => {
                const player = room.players.find(p => p.id === socket.id);
                if (player) {
                    handleDisconnect(socket, roomId, player);
                }
            });
        });

        // Add handler for claiming win after timeout
        socket.on('claim_timeout_win', ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room) return;

            // Find the disconnected player
            const disconnectedPlayer = room.players.find(p => !p.connected);
            if (disconnectedPlayer) {
                // Manually trigger leave logic for that player
                // We use a mock object since handleLeave expects a socket-like object with an id
                handleLeave({ id: disconnectedPlayer.id, leave: () => { } }, roomId, false);
            }
        });

        socket.on('keep_waiting', ({ roomId }) => {
            console.log(`Player in room ${roomId} chose to wait indefinitely.`);
        });

        const handleDisconnect = (socket, roomId, player) => {
            const room = rooms.get(roomId);
            if (!room) return;

            // If game is in progress (2 players), start grace period
            if (room.players.length === 2) {
                console.log(`Player ${player.username} disconnected. Starting grace period...`);
                player.connected = false;

                // Notify opponent
                io.to(roomId).emit('player_disconnected', { username: player.username });

                // Set timeout (e.g., 60 seconds)
                player.disconnectTimeout = setTimeout(() => {
                    console.log(`Player ${player.username} timed out. Prompting opponent.`);

                    // Find opponent
                    const opponent = room.players.find(p => p.id !== player.id);
                    if (opponent) {
                        io.to(opponent.id).emit('opponent_timeout_prompt', { username: player.username });
                    } else {
                        // Both gone? Close room.
                        handleLeave(socket, roomId, false);
                    }
                }, 60000); // 60 seconds
            } else {
                // If not in game (or waiting), just leave immediately ?? 
                // Actually, maybe better to keep them if they refresh in lobby? 
                // For now, if waiting for opponent, we remove them to clean up empty rooms.
                handleLeave(socket, roomId, true);
            }
        };

        const handleLeave = async (socketObj, roomId, isExplicit) => {
            const room = rooms.get(roomId);
            if (!room) return;

            // Check if game was in progress (2 players)
            if (room.players.length === 2) {
                // Determine who is leaving/timing out
                // Note: socket.id might match, OR if it was a timeout, we need to find via player object
                // If it's a timeout, the socket.id might be stale if they tried to reconnect but failed? 
                // Actually, handleDisconnect passes the 'player' object reference which has the timeout.

                // We need to find "who is the leaver". 
                // If socket.id matches a player, that's the leaver.
                const leaver = room.players.find(p => p.id === socketObj.id);

                // Wait, if this is called from Timeout, socket.id is correct from the closure.

                const winner = room.players.find(p => p.id !== socketObj.id);

                if (leaver && winner) {
                    console.log(`Player ${leaver.username} left/timed out. Winner: ${winner.username}`);

                    // Clear any pending timeouts just in case
                    if (leaver.disconnectTimeout) clearTimeout(leaver.disconnectTimeout);
                    if (winner.disconnectTimeout) clearTimeout(winner.disconnectTimeout);

                    // Update Stats
                    if (supabase) {
                        await updateStats(supabase, winner.username, true);
                        await updateStats(supabase, leaver.username, false);
                    }

                    // Notify remaining player of win
                    io.to(roomId).emit('game_ended', {
                        winner: winner.color,
                        reason: isExplicit ? 'opponent_left' : 'opponent_timeout'
                    });
                }
            }

            room.players = room.players.filter(p => p.id !== socketObj.id);
            if (socketObj.leave) socketObj.leave(roomId);

            if (room.players.length === 0) {
                rooms.delete(roomId);
            } else {
                io.to(roomId).emit('player_left', { socketId: socketObj.id });
            }
            io.emit('rooms_update', getPublicRooms()); // Broadcast update to lobby
        };
    });
};

async function updateStats(supabase, username, isWin) {
    if (!supabase) return;
    try {
        // 1. Get Profile
        const { data: profile } = await supabase
            .from('xiangqi_users')
            .select('*')
            .eq('username', username)
            .single();

        if (!profile) return; // Should create if not exists? User should be created on login.

        // 2. Calc New Stats
        const newWins = profile.wins + (isWin ? 1 : 0);
        const newLosses = profile.losses + (isWin ? 0 : 1);
        const rankChange = isWin ? 25 : -10; // Simple Elo-like
        const newRank = Math.max(0, profile.rank + rankChange);

        // 3. Update
        await supabase
            .from('xiangqi_users')
            .update({ wins: newWins, losses: newLosses, rank: newRank })
            .eq('username', username);

    } catch (e) {
        console.error("Error updating stats:", e);
    }
}
