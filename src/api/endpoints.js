import { request, requestList } from './client.js';

/**
 * Every server call the app makes, in one place.
 */
export const usersApi = {
  discover: (params) => requestList({ method: 'GET', url: '/users/discover', params }),
  profile: (userId) => request({ method: 'GET', url: `/users/${userId}` }),
  me: () => request({ method: 'GET', url: '/users/me' }),
  updateMe: (data) => request({ method: 'PATCH', url: '/users/me', data }),
  updateLocation: (data) => request({ method: 'PUT', url: '/users/me/location', data }),
  block: (userId) => request({ method: 'POST', url: `/users/${userId}/block` }),
  unblock: (userId) => request({ method: 'DELETE', url: `/users/${userId}/block` }),
  blocked: () => request({ method: 'GET', url: '/users/blocked' }),
  blockedBy: () => request({ method: 'GET', url: '/users/blocked-by' }),
  follow: (userId) => request({ method: 'POST', url: `/users/${userId}/follow` }),
  unfollow: (userId) => request({ method: 'DELETE', url: `/users/${userId}/follow` }),
  followers: (userId) => request({ method: 'GET', url: `/users/${userId}/followers` }),
  following: (userId) => request({ method: 'GET', url: `/users/${userId}/following` }),
  onlineCount: () => request({ method: 'GET', url: '/users/online-count' }),

  uploadAvatar: (formData) =>
    request({
      method: 'POST',
      url: '/users/me/avatar',
      data: formData,
    }),

  deleteAccount: () => request({ method: 'DELETE', url: '/users/me' }),
};

export const chatApi = {
  conversations: (params) => requestList({ method: 'GET', url: '/chat/conversations', params }),
  open: (userId) => request({ method: 'POST', url: '/chat/conversations', data: { userId } }),
  conversation: (id) => request({ method: 'GET', url: `/chat/conversations/${id}` }),
  messages: (id, params) =>
    requestList({ method: 'GET', url: `/chat/conversations/${id}/messages`, params }),
  send: (id, data) => request({ method: 'POST', url: `/chat/conversations/${id}/messages`, data }),
  markRead: (id) => request({ method: 'POST', url: `/chat/conversations/${id}/read` }),

  sendMedia: (id, formData) =>
    request({
      method: 'POST',
      url: `/chat/conversations/${id}/media`,
      data: formData,
      timeout: 90_000,
    }),

  deleteMessage: (messageId, scope) =>
    request({ method: 'DELETE', url: `/chat/messages/${messageId}`, params: { scope } }),

  react: (messageId, emoji) =>
    request({ method: 'POST', url: `/chat/messages/${messageId}/reactions`, data: { emoji } }),
  unreadCount: () => request({ method: 'GET', url: '/chat/unread-count' }),
};

export const coinsApi = {
  wallet: () => request({ method: 'GET', url: '/coins/wallet' }),
  transactions: (params) => requestList({ method: 'GET', url: '/coins/transactions', params }),
  packages: () => request({ method: 'GET', url: '/coins/packages' }),
  dailyBonus: () => request({ method: 'GET', url: '/coins/daily-bonus' }),
  getDailyBonus: () => request({ method: 'GET', url: '/coins/daily-bonus' }),
  claimDailyBonus: () => request({ method: 'POST', url: '/coins/daily-bonus/claim' }),
};

export const paymentsApi = {
  options: () => request({ method: 'GET', url: '/payments/options' }),
  createCashfreeOrder: (packageId, returnUrl) =>
    request({ method: 'POST', url: '/payments/orders/cashfree', data: { packageId, returnUrl } }),
  verifyCashfree: (orderId) =>
    request({ method: 'POST', url: '/payments/orders/cashfree/verify', data: { orderId } }),
  createUpiOrder: (packageId) =>
    request({ method: 'POST', url: '/payments/orders/upi', data: { packageId } }),
  submitProof: (orderId, data) =>
    request({ method: 'POST', url: `/payments/orders/${orderId}/proof`, data }),
  orders: (params) => requestList({ method: 'GET', url: '/payments/orders', params }),
  getInvoice: (orderId) => request({ method: 'GET', url: `/payments/orders/${orderId}/invoice?format=json` }),
  redeemCode: (code) => request({ method: 'POST', url: '/payments/redeem', data: { code } }),
  validateCoupon: (code, priceInRupees) =>
    request({ method: 'POST', url: '/payments/coupon/validate', data: { code, priceInRupees } }),
};

export const eventsApi = {
  list: () => request({ method: 'GET', url: '/events' }),
};

export const roomsApi = {
  list: (params) => requestList({ method: 'GET', url: '/rooms', params }),
  create: (data) => request({ method: 'POST', url: '/rooms', data }),
  get: (roomId) => request({ method: 'GET', url: `/rooms/${roomId}` }),
  join: (roomId, data) => request({ method: 'POST', url: `/rooms/${roomId}/join`, data }),
  leave: (roomId) => request({ method: 'POST', url: `/rooms/${roomId}/leave` }),
  close: (roomId) => request({ method: 'POST', url: `/rooms/${roomId}/close` }),
  messages: (roomId, params) => requestList({ method: 'GET', url: `/rooms/${roomId}/messages`, params }),
  send: (roomId, data) => request({ method: 'POST', url: `/rooms/${roomId}/messages`, data }),

  sendMedia: (roomId, formData) =>
    request({
      method: 'POST',
      url: `/rooms/${roomId}/media`,
      data: formData,
      timeout: 90_000,
    }),
};

export const statusApi = {
  feed: () => request({ method: 'GET', url: '/status' }),
  postText: (data) => request({ method: 'POST', url: '/status/text', data }),

  postMedia: (formData) =>
    request({
      method: 'POST',
      url: '/status/media',
      data: formData,
      timeout: 90_000,
    }),

  byUser: (userId) => request({ method: 'GET', url: `/status/user/${userId}` }),
  markViewed: (statusId) => request({ method: 'POST', url: `/status/${statusId}/view` }),
  viewers: (statusId) => request({ method: 'GET', url: `/status/${statusId}/viewers` }),
  remove: (statusId) => request({ method: 'DELETE', url: `/status/${statusId}` }),
};

export const gamesApi = {
  list: () => request({ method: 'GET', url: '/games' }),
  start: (gameKey) => request({ method: 'POST', url: '/games/sessions', data: { gameKey } }),
  complete: (sessionId, score) =>
    request({ method: 'POST', url: `/games/sessions/${sessionId}/complete`, data: { score } }),
  leaderboard: (params) => request({ method: 'GET', url: '/games/leaderboard', params }),
  getPointsConversion: () => request({ method: 'GET', url: '/games/points-conversion' }),
  convertPoints: (points) => request({ method: 'POST', url: '/games/convert-points', data: { points } }),
};

export const reportsApi = {
  create: (data) => request({ method: 'POST', url: '/reports', data }),
};

export const deviceApi = {
  register: (data) => request({ method: 'POST', url: '/notifications/devices', data }),
  unregister: (token) => request({ method: 'DELETE', url: '/notifications/devices', data: { token } }),
};

export const notificationsApi = {
  testPush: (data) => request({ method: 'POST', url: '/notifications/test', data }),
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

export const feedbackApi = {
  submit: (data) => request({ method: 'POST', url: '/feedback', data }),
  list: () => request({ method: 'GET', url: '/feedback' }),
  my: () => request({ method: 'GET', url: '/feedback/my' }),
};

export const supportApi = {
  createTicket: (data) => request({ method: 'POST', url: '/support/tickets', data }),
  myTickets: () => request({ method: 'GET', url: '/support/my-tickets' }),
  ticketDetails: (ticketId) => request({ method: 'GET', url: `/support/tickets/${ticketId}` }),
  sendMessage: (ticketId, data) =>
    request({ method: 'POST', url: `/support/tickets/${ticketId}/messages`, data }),
  uploadImage: (formData) =>
    request({
      method: 'POST',
      url: '/support/upload',
      data: formData,
      timeout: 60_000,
    }),
  cannedResponses: () => request({ method: 'GET', url: '/support/canned-responses' }),
};

export const withdrawalsApi = {
  getMyWithdrawals: (params) => requestList({ method: 'GET', url: '/withdrawals/my', params }),
  getEarningsStatus: () => request({ method: 'GET', url: '/withdrawals/earnings-status' }),
  requestWithdrawal: (data) => request({ method: 'POST', url: '/withdrawals/request', data }),
};

