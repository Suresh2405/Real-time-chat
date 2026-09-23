import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from './MessageBubble';
import { getConversationMessages, sendMessage, uploadFile, deleteMessage } from '../api/chat';
import { Paperclip, Send, X, ArrowLeft, Image as ImageIcon, FileText } from 'lucide-react';
import { formatLastSeen } from '../utils/formatters';

const ChatWindow = ({ conversation, onBack }) => {
  const { user } = useAuth();
  const {
    messages,
    setMessages,
    typingUsers,
    sendTypingStart,
    sendTypingStop,
    sendReadReceipt
  } = useSocket();

  const [inputContent, setInputContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchMessages = async () => {
    if (!conversation) return;
    try {
      const data = await getConversationMessages(conversation.id);
      setMessages(data);
      sendReadReceipt();
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (e) => {
    setInputContent(e.target.value);
    sendTypingStart();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 2000);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputContent.trim() && !selectedFile) return;

    sendTypingStop();
    let attachmentId = null;

    if (selectedFile) {
      setUploading(true);
      try {
        const att = await uploadFile(selectedFile);
        attachmentId = att.id;
      } catch (err) {
        alert(err.response?.data?.detail || 'File upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
      setSelectedFile(null);
    }

    try {
      const newMsg = await sendMessage(conversation.id, inputContent.trim(), attachmentId);
      setInputContent('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await deleteMessage(msgId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m
        )
      );
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  if (!conversation) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          padding: '20px',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Send size={36} color="var(--primary)" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          Real-Time Chat Dashboard
        </h2>
        <p style={{ fontSize: '0.9rem', maxWidth: '360px', textAlign: 'center' }}>
          Select a conversation from the sidebar or search for users to start instant messaging!
        </p>
      </div>
    );
  }

  const otherMember = conversation.members?.find((m) => m.user_id !== user?.id);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-icon btn-secondary mobile-back" onClick={onBack} style={{ display: 'none' }}>
            <ArrowLeft size={18} />
          </button>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: conversation.type === 'group' ? 'linear-gradient(135deg, #10b981, #059669)' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '1.1rem',
              color: '#fff',
            }}
          >
            {conversation.name ? conversation.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{conversation.name}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {conversation.type === 'group'
                ? `${conversation.members?.length || 0} members`
                : formatLastSeen(otherMember?.user?.last_seen)}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === user?.id}
            currentUserId={user?.id}
            onDelete={handleDeleteMessage}
          />
        ))}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Someone is typing</span>
            <div style={{ display: 'flex', gap: '3px' }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Draft Attachment Preview */}
      {selectedFile && (
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(15, 23, 42, 0.9)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <FileText size={18} color="var(--primary)" />
            <span>{selectedFile.name}</span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(11, 15, 25, 0.8)',
        }}
      >
        <label
          className="btn btn-icon btn-secondary"
          style={{ cursor: 'pointer' }}
          title="Attach File/Image"
        >
          <Paperclip size={18} />
          <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        <input
          type="text"
          className="input-field"
          placeholder="Type a message..."
          value={inputContent}
          onChange={handleInputChange}
        />

        <button
          type="submit"
          className="btn btn-primary btn-icon"
          disabled={uploading || (!inputContent.trim() && !selectedFile)}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
