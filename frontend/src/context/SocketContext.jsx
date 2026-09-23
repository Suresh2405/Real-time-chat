import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getWebSocketUrl } from '../utils/websocket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !activeConversationId) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const wsUrl = getWebSocketUrl(activeConversationId, token);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      console.log(`Connected to chat WebSocket for conversation #${activeConversationId}`);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data, user_id, conversation_id } = payload;

        if (type === 'message') {
          setMessages((prev) => [...prev, data]);
        } else if (type === 'typing_start') {
          if (user_id !== user?.id) {
            setTypingUsers((prev) => new Set(prev).add(user_id));
          }
        } else if (type === 'typing_stop') {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(user_id);
            return next;
          });
        } else if (type === 'user_online') {
          setOnlineUsers((prev) => new Set(prev).add(user_id));
        } else if (type === 'user_offline') {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(user_id);
            return next;
          });
        } else if (type === 'notification') {
          setNotifications((prev) => [data, ...prev]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [token, activeConversationId, user?.id]);

  const sendTypingStart = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'typing_start' }));
    }
  };

  const sendTypingStop = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'typing_stop' }));
    }
  };

  const sendReadReceipt = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'message_read' }));
    }
  };

  return (
    <SocketContext.Provider
      value={{
        activeConversationId,
        setActiveConversationId,
        socket,
        messages,
        setMessages,
        typingUsers,
        onlineUsers,
        notifications,
        setNotifications,
        sendTypingStart,
        sendTypingStop,
        sendReadReceipt,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
