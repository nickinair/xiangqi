module.exports = (io, supabase) => {
    const rooms = new Map(); // Store room state in memory for now

    // Helper to get public room list
    const getPublicRooms = () => {
        return Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            players: r.players.length
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
                players: [{ id: socket.id, username, color: 'red' }],
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

            if (room.players.length >= 2) {
                return callback({ success: false, error: 'Room is full' });
            }

            // Determine color based on existing player
            const color = room.players[0].color === 'red' ? 'green' : 'red';
            const player = { id: socket.id, username, color };
            room.players.push(player);
            socket.join(roomId);

            // Notify everyone in room
            io.to(roomId).emit('player_joined', { room, newPlayer: player });
            io.emit('rooms_update', getPublicRooms()); // Broadcast update to lobby

            console.log(`User ${username} joined room ${roomId}`);
            callback({ success: true, room });

            // If 2 players, start game? 
            // Or wait for 'start_game' event? 
            // For simplicity, let's say game acts as started when 2 players are there.
            io.to(roomId).emit('game_start', {
                players: room.players,
                currentTurn: 'red'
            });
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
            handleLeave(socket, roomId);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Find rooms user was in and handle leave
            rooms.forEach((room, roomId) => {
                if (room.players.find(p => p.id === socket.id)) {
                    handleLeave(socket, roomId);
                }
            });
        });

        const handleLeave = async (socket, roomId) => {
            const room = rooms.get(roomId);
            if (!room) return;

            // Check if game was in progress (2 players)
            if (room.players.length === 2) {
                const leaver = room.players.find(p => p.id === socket.id);
                const winner = room.players.find(p => p.id !== socket.id);

                if (leaver && winner) {
                    console.log(`Player ${leaver.username} left. Winner: ${winner.username}`);

                    // Update Stats
                    if (supabase) {
                        await updateStats(supabase, winner.username, true);
                        await updateStats(supabase, leaver.username, false);
                    }

                    // Notify remaining player of win
                    io.to(roomId).emit('game_ended', {
                        winner: winner.color,
                        reason: 'opponent_left'
                    });
                }
            }

            room.players = room.players.filter(p => p.id !== socket.id);
            socket.leave(roomId);

            if (room.players.length === 0) {
                rooms.delete(roomId);
            } else {
                io.to(roomId).emit('player_left', { socketId: socket.id });
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
