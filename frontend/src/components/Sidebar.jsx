import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getConversations, createConversation } from '../api/chat';
import { searchUsers } from '../api/users';
import {
  MessageSquarePlus,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  Users,
  SearchCode
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

const Sidebar = ({
  activeId,
  onSelectConversation,
  onOpenGroupModal,
  onOpenProfileModal,
  onOpenNotificationModal,
  onOpenSearchModal
}) => {
  const { user, logout } = useAuth();
  const { onlineUsers, notifications } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeId]);

  const handleUserSearch = async (e) => {
    const q = e.target.value;
    setUserQuery(q);
    if (q.trim().length > 0) {
      setSearching(true);
      try {
        const results = await searchUsers(q);
        setSearchResults(results);
      } catch (err) {
        console.error('User search failed', err);
      }
    } else {
      setSearching(false);
      setSearchResults([]);
    }
  };

  const handleStartPrivateChat = async (targetUserId) => {
    try {
      const conv = await createConversation({
        type: 'private',
        target_user_id: targetUserId,
      });
      setUserQuery('');
      setSearching(false);
      await fetchConversations();
      onSelectConversation(conv.id);
    } catch (err) {
      console.error('Failed to start conversation', err);
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div
      className="glass-panel"
      style={{
        width: '340px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          onClick={onOpenProfileModal}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              color: '#fff',
              fontSize: '1.1rem',
            }}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user?.username}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Active</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-icon btn-secondary"
            onClick={onOpenNotificationModal}
            title="Notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button className="btn btn-icon btn-secondary" onClick={onOpenSearchModal} title="Search Messages">
            <SearchCode size={18} />
          </button>
          <button className="btn btn-icon btn-secondary" onClick={onOpenGroupModal} title="New Group">
            <Users size={18} />
          </button>
          <button className="btn btn-icon btn-danger" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* User Search Input */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search users..."
            value={userQuery}
            onChange={handleUserSearch}
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* List Feed (User Search Results or Active Conversations) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {searching ? (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              User Search Results
            </div>
            {searchResults.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No users found matching "{userQuery}"
              </div>
            ) : (
              searchResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleStartPrivateChat(u.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  className="sidebar-item"
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{u.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            {conversations.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No conversations yet. Use the search bar above to start a chat!
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === activeId;
                const otherMember = conv.members.find((m) => m.user_id !== user?.id);
                const isOnline = conv.type === 'private' && otherMember && onlineUsers.has(otherMember.user_id);

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    style={{
                      padding: '12px',
                      marginBottom: '4px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: conv.type === 'group' ? 'linear-gradient(135deg, #10b981, #059669)' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '1rem',
                        }}
                      >
                        {conv.name ? conv.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      {isOnline && (
                        <span
                          className="status-indicator status-online"
                          style={{ position: 'absolute', bottom: '0', right: '0' }}
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span
                          style={{
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: '0.92rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {conv.name || 'Chat'}
                        </span>
                        {conv.last_message && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {formatDate(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '180px',
                          }}
                        >
                          {conv.last_message
                            ? conv.last_message.is_deleted
                              ? 'Message deleted'
                              : conv.last_message.content
                            : 'No messages yet'}
                        </span>
                        {conv.unread_count > 0 && (
                          <span
                            style={{
                              background: 'var(--primary)',
                              color: '#fff',
                              borderRadius: '10px',
                              padding: '2px 7px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
