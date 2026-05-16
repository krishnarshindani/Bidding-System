import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  userId: string | null;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  userId: null,
  emit: () => {},
  on: () => {},
  off: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const activeSocketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null>(null);
  const connectedUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const emit = useCallback((event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn(`Socket not connected. Cannot emit event: ${event}`);
    }
  }, [socket, isConnected]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  const off = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.off(event, callback);
    }
  }, [socket]);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // On true unmount, disconnect the socket
      if (activeSocketRef.current) {
        console.log(`SocketProvider unmounting: disconnecting socket`);
        activeSocketRef.current.disconnect();
        activeSocketRef.current = null;
      }
    };
  }, []);

  // Handle user changes and reconnect socket
  useEffect(() => {
    const handleUserChanged = (event: any) => {
      const newUser = event.detail;
      // Consistently convert to string or null
      const newUserId = newUser?.id ? String(newUser.id) : null;
      userIdRef.current = newUserId;
      setUserId(newUserId);
    };

    window.addEventListener('userChanged', handleUserChanged);
    return () => {
      window.removeEventListener('userChanged', handleUserChanged);
    };
  }, []);

  // Manage socket connection based on userId
  useEffect(() => {
    const socketServerUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

    // If no user ID, clean up and don't connect
    if (!userId) {
      if (activeSocketRef.current) {
        console.log(`Disconnecting socket: no active user`);
        activeSocketRef.current.disconnect();
        activeSocketRef.current = null;
        connectedUserIdRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // If we already have a socket for this exact user, skip reconnection
    if (connectedUserIdRef.current === userId && activeSocketRef.current) {
      console.log(`Socket already exists for user ${userId}, skipping reconnection`);
      return;
    }

    // Disconnect old socket if switching to a different user
    if (activeSocketRef.current && connectedUserIdRef.current !== userId) {
      console.log(`Switching users: disconnecting previous socket for user ${connectedUserIdRef.current}`);
      activeSocketRef.current.disconnect();
      activeSocketRef.current = null;
      connectedUserIdRef.current = null;
    }

    // Get JWT token for socket auth
    const authToken = localStorage.getItem('auth_token');

    console.log(`Creating new socket connection for user ${userId}`);

    // Mark this user as the one we're connecting for
    connectedUserIdRef.current = userId;

    // Create new socket connection with JWT token
    const newSocket = io(socketServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      auth: {
        userId: userId,
        token: authToken,
      },
    });

    newSocket.on('connect', () => {
      console.log(`✓ Connected to Socket.IO server with user ID: ${userId}`);
      if (mountedRef.current) {
        setIsConnected(true);
      }
      // Notify server that user has joined
      newSocket.emit('user:join', userId);
      console.log(`[SOCKET] User ${userId} joined via socket ${newSocket.id}`);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log(`✗ Disconnected from Socket.IO server - reason: ${reason}`);
      // Only clear connection if this socket is still the active one
      if (activeSocketRef.current === newSocket && mountedRef.current) {
        setIsConnected(false);
      }
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error.message);
    });

    newSocket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    // Track this as the active socket
    activeSocketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup: only disconnect if the userId has ACTUALLY changed to a different value
    // The mountedRef check prevents disconnection on React re-renders / Strict Mode double-mount
    return () => {
      // If the component is still mounted and the user hasn't changed, do NOT disconnect
      if (mountedRef.current && userIdRef.current === userId) {
        console.log(`[SOCKET] Effect cleanup for user ${userId}, but user unchanged & mounted — keeping socket alive`);
        return;
      }
      // Otherwise (unmount or user actually changed), disconnect
      if (activeSocketRef.current === newSocket) {
        console.log(`[SOCKET] Cleanup: disconnecting socket for user ${userId} (mounted: ${mountedRef.current}, currentUser: ${userIdRef.current})`);
        newSocket.disconnect();
        activeSocketRef.current = null;
        connectedUserIdRef.current = null;
      }
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, userId, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};