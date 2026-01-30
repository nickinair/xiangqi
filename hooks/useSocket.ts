import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Position, PlayerColor } from '../types';

const SERVER_URL = `http://${window.location.hostname}:3005`; // Dynamic for local network play

export const useSocket = (username: string | undefined) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!username) return;

        const newSocket = io(SERVER_URL, {
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Socket connected:', newSocket.id);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Socket disconnected');
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [username]);

    const emit = useCallback((event: string, data: any, callback?: (res: any) => void) => {
        if (socket) {
            socket.emit(event, data, callback);
        }
    }, [socket]);

    return { socket, isConnected, emit };
};
