import api from './axios';

export const getMe = async () => {
  const res = await api.get('/users/me');
  return res.data;
};

export const updateMe = async (data) => {
  const res = await api.put('/users/me', data);
  return res.data;
};

export const searchUsers = async (query) => {
  const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
  return res.data;
};
