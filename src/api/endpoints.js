import { request, requestList } from './client.js';

/**
 * Every server call the app makes, in one place.
 *
 * Screens import from here rather than assembling URLs inline, so a route that
 * changes on the server is a one-line fix rather than a search across screens.
 */
export const usersApi = {
  discover: (params) => requestList({ method: 'GET', url: '/users/discover', params }),
  profile: (userId) => request({ method: 'GET', url: `/users/${userId}` }),
  me: () => request({ method: 'GET', url: '/users/me' }),
  updateMe: (data) => request({ method: 'PATCH', url: '/users/me', data }),
  updateLocation: (data) => request({ method: 'PUT', url: '/users/me/location', data }),
  block: (userId) => request({ method: 'POST', url: `/users/${userId}/block` }),
  unblock: (userId) => request({ method: 'DELETE', url: `/users/${userId}/block` }),
  onlineCount: () => request({ method: 'GET', url: '/users/online-count' }),

  uploadAvatar: (formData) =>
    request({
      method: 'POST',
      url: '/users/me/avatar',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const chatApi = {
  conversations: (params) => requestList({ method: 'GET', url: '/chat/conversations', params }),
  open: (userId) => request({ method: 'POST', url: '/chat/conversations', data: { userId } }),
  conversation: (id) => request({ method: 'GET', url: `/chat/conversations/${id}` }),
  messages: (id, params) =>
    requestList({ method: 'GET', url: `/chat/conversations/${id}/messages`, params }),
  send: (id, data) => request({ method: 'POST', url: `/chat/conversations/${id}/messages`, data }),
  markRead: (id) => request({ method: 'POST', url: `/chat/conversations/${id}/read` }),
  unreadCount: () => request({ method: 'GET', url: '/chat/unread-count' }),
};

export const coinsApi = {
  wallet: () => request({ method: 'GET', url: '/coins/wallet' }),
  transactions: (params) => requestList({ method: 'GET', url: '/coins/transactions', params }),
  packages: () => request({ method: 'GET', url: '/coins/packages' }),
  dailyBonus: () => request({ method: 'GET', url: '/coins/daily-bonus' }),
  claimDailyBonus: () => request({ method: 'POST', url: '/coins/daily-bonus/claim' }),
};

export const paymentsApi = {
  options: () => request({ method: 'GET', url: '/payments/options' }),
  createUpiOrder: (packageId) =>
    request({ method: 'POST', url: '/payments/orders/upi', data: { packageId } }),
  submitProof: (orderId, data) =>
    request({ method: 'POST', url: `/payments/orders/${orderId}/proof`, data }),
  orders: (params) => requestList({ method: 'GET', url: '/payments/orders', params }),
};

export const roomsApi = {
  list: (params) => requestList({ method: 'GET', url: '/rooms', params }),
  create: (data) => request({ method: 'POST', url: '/rooms', data }),
  get: (roomId) => request({ method: 'GET', url: `/rooms/${roomId}` }),
  join: (roomId, data) => request({ method: 'POST', url: `/rooms/${roomId}/join`, data }),
  leave: (roomId) => request({ method: 'POST', url: `/rooms/${roomId}/leave` }),
  messages: (roomId, params) => requestList({ method: 'GET', url: `/rooms/${roomId}/messages`, params }),
  send: (roomId, data) => request({ method: 'POST', url: `/rooms/${roomId}/messages`, data }),
};

export const gamesApi = {
  list: () => request({ method: 'GET', url: '/games' }),
  start: (gameKey) => request({ method: 'POST', url: '/games/sessions', data: { gameKey } }),
  complete: (sessionId, score) =>
    request({ method: 'POST', url: `/games/sessions/${sessionId}/complete`, data: { score } }),
  leaderboard: (params) => request({ method: 'GET', url: '/games/leaderboard', params }),
};

export const reportsApi = {
  create: (data) => request({ method: 'POST', url: '/reports', data }),
};

export const settingsApi = {
  public: () => request({ method: 'GET', url: '/settings/public' }),
};

export const bannersApi = {
  listLive: () => request({ method: 'GET', url: '/banners' }),
  recordImpressions: (bannerIds) =>
    request({ method: 'POST', url: '/banners/impressions', data: { bannerIds } }),
  recordTap: (bannerId) => request({ method: 'POST', url: `/banners/${bannerId}/tap` }),
};
