import React, { useState } from 'react';
import { X, Users, Search, Check } from 'lucide-react';
import { searchUsers } from '../api/users';
import { createConversation } from '../api/chat';

const GroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim()) {
      try {
        const res = await searchUsers(q);
        setSearchResults(res);
      } catch (err) {
        console.error('Failed to search users', err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const toggleSelectUser = (u) => {
    if (selectedUsers.some((su) => su.id === u.id)) {
      setSelectedUsers(selectedUsers.filter((su) => su.id !== u.id));
    } else {
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setLoading(true);
    try {
      const memberIds = selectedUsers.map((u) => u.id);
      const groupConv = await createConversation({
        type: 'group',
        name: groupName.trim(),
        member_ids: memberIds,
      });
      onGroupCreated(groupConv.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color="var(--primary)" size={22} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Create Group Chat</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreateGroup}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              Group Title
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Engineering Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              Add Members
            </label>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={handleSearch}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            {/* Selected Pills */}
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                {selectedUsers.map((su) => (
                  <span
                    key={su.id}
                    style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid var(--primary)',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {su.username}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleSelectUser(su)} />
                  </span>
                ))}
              </div>
            )}

            {/* Search Results List */}
            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {searchResults.map((u) => {
                const isSelected = selectedUsers.some((su) => su.id === u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSelectUser(u)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                    </div>
                    {isSelected && <Check size={16} color="var(--accent)" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !groupName.trim()}>
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupModal;
