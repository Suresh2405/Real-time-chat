import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import GroupModal from '../components/GroupModal';
import UserProfileModal from '../components/UserProfileModal';
import NotificationCenter from '../components/NotificationCenter';
import SearchModal from '../components/SearchModal';
import { useSocket } from '../context/SocketContext';
import { getConversations } from '../api/chat';

const ChatPage = () => {
  const { activeConversationId, setActiveConversationId } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);

  // Modals state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const fetchConvs = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      if (activeConversationId) {
        const found = data.find((c) => c.id === activeConversationId);
        if (found) setActiveConv(found);
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  useEffect(() => {
    fetchConvs();
  }, [activeConversationId]);

  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    const found = conversations.find((c) => c.id === convId);
    if (found) {
      setActiveConv(found);
    } else {
      // Refresh list to find new conversation
      fetchConvs();
    }
  };

  return (
    <div className="chat-layout">
      <Sidebar
        activeId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onOpenGroupModal={() => setIsGroupModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
      />

      <ChatWindow
        conversation={activeConv}
        onBack={() => {
          setActiveConversationId(null);
          setActiveConv(null);
        }}
      />

      {/* Modals */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={(newGroupId) => handleSelectConversation(newGroupId)}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <NotificationCenter
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectConversation={handleSelectConversation}
      />
    </div>
  );
};

export default ChatPage;
