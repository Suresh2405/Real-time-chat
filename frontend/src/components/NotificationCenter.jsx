import React, { useEffect } from 'react';
import { X, Bell, Check, CheckCheck } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { formatDate } from '../utils/formatters';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { notifications, setNotifications } = useSocket();

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell color="var(--primary)" size={22} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Notifications</h3>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleMarkAllRead}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              Mark all read
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: 'var(--radius-md)',
                  background: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{n.title}</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{n.message}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{formatDate(n.created_at)}</div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    title="Mark as read"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
