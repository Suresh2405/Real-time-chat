import React from 'react';
import { Trash2, FileText, Download, Check, CheckCheck } from 'lucide-react';
import { formatTime, formatFileSize } from '../utils/formatters';

const MessageBubble = ({ message, isOwn, onDelete, currentUserId }) => {
  const isDeleted = message.is_deleted;
  const readByOthers = (message.read_by || []).some((id) => id !== currentUserId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        margin: '8px 0',
        width: '100%',
      }}
    >
      {!isOwn && message.sender && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', marginLeft: '12px' }}>
          {message.sender.username}
        </span>
      )}

      <div
        style={{
          position: 'relative',
          maxWidth: '70%',
          padding: '12px 16px',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isOwn
            ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
            : 'rgba(30, 41, 59, 0.85)',
          color: '#ffffff',
          boxShadow: isOwn ? '0 4px 14px rgba(99, 102, 241, 0.25)' : '0 2px 10px rgba(0,0,0,0.2)',
          border: isOwn ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
          fontStyle: isDeleted ? 'italic' : 'normal',
          opacity: isDeleted ? 0.7 : 1,
        }}
      >
        {/* Attachments */}
        {!isDeleted && message.attachments && message.attachments.length > 0 && (
          <div style={{ marginBottom: message.content ? '10px' : '0' }}>
            {message.attachments.map((att) => {
              const fileUrl = att.file_path;
              if (att.file_type === 'image') {
                return (
                  <div key={att.id} style={{ borderRadius: '8px', overflow: 'hidden', marginTop: '4px' }}>
                    <img
                      src={fileUrl}
                      alt={att.filename}
                      style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                );
              }
              return (
                <a
                  key={att.id}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                  }}
                >
                  <FileText size={20} color="#a5b4fc" />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {att.filename}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                      {formatFileSize(att.file_size)}
                    </div>
                  </div>
                  <Download size={16} style={{ marginLeft: 'auto' }} />
                </a>
              );
            })}
          </div>
        )}

        {/* Message Content */}
        {message.content && <p style={{ wordBreak: 'break-word', fontSize: '0.94rem', lineHeight: '1.45' }}>{message.content}</p>}

        {/* Footer info: time & read receipts */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '4px',
            marginTop: '4px',
            fontSize: '0.68rem',
            color: isOwn ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
          }}
        >
          <span>{formatTime(message.created_at)}</span>
          {isOwn && !isDeleted && (
            readByOthers ? (
              <CheckCheck size={14} color="#60a5fa" title="Read" />
            ) : (
              <Check size={14} title="Sent" />
            )
          )}
        </div>

        {/* Delete action for own message */}
        {isOwn && !isDeleted && (
          <button
            onClick={() => onDelete(message.id)}
            title="Delete Message"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0.8,
              transition: 'all 0.2s',
            }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
