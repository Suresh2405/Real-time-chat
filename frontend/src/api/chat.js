import api from './axios';

export const getConversations = async () => {
  const res = await api.get('/conversations');
  return res.data;
};

export const createConversation = async (data) => {
  const res = await api.post('/conversations', data);
  return res.data;
};

export const getConversationMessages = async (conversationId, limit = 50, offset = 0) => {
  const res = await api.get(`/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`);
  return res.data;
};

export const sendMessage = async (conversationId, content, attachmentId = null) => {
  const res = await api.post(`/conversations/${conversationId}/messages`, {
    content,
    attachment_id: attachmentId,
  });
  return res.data;
};

export const deleteMessage = async (messageId) => {
  const res = await api.delete(`/messages/${messageId}`);
  return res.data;
};

export const searchMessages = async (query, conversationId = null) => {
  let url = `/messages/search?q=${encodeURIComponent(query)}`;
  if (conversationId) {
    url += `&conversation_id=${conversationId}`;
  }
  const res = await api.get(url);
  return res.data;
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const addGroupMember = async (conversationId, userId, role = 'member') => {
  const res = await api.post(`/conversations/${conversationId}/members`, {
    user_id: userId,
    role,
  });
  return res.data;
};

export const removeGroupMember = async (conversationId, userId) => {
  const res = await api.delete(`/conversations/${conversationId}/members/${userId}`);
  return res.data;
};
