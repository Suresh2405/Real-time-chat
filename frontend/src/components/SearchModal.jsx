import React, { useState } from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import { searchMessages } from '../api/chat';
import { formatDate } from '../utils/formatters';

const SearchModal = ({ isOpen, onClose, onSelectConversation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await searchMessages(query.trim());
      setResults(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (conversationId) => {
    onSelectConversation(conversationId);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search color="var(--primary)" size={22} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Search Message History</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search keyword in messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '42px' }}
            />
          </div>
        </form>

        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {query ? 'No matching messages found' : 'Enter a search term above'}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                Found {total} message{total > 1 ? 's' : ''}
              </div>
              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.conversation_id)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--primary)' }}>
                      {item.conversation_name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '2px' }}>
                    <strong>{item.sender_name}:</strong> {item.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
