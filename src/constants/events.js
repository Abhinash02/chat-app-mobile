/** Mirrors the server's realtime/events.js. Keep the two in step. */
export const SOCKET_EVENT = Object.freeze({
  READY: 'connection:ready',

  PRESENCE_UPDATED: 'presence:updated',
  FOLLOW_UPDATED: 'user:follow:updated',

  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  MESSAGE_READ_RECEIPT: 'message:read:receipt',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_REACTION: 'message:reaction',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_UPDATE: 'typing:update',

  WALLET_UPDATED: 'wallet:updated',
  FREE_TALK_TICK: 'freetalk:tick',
  FREE_TALK_EXHAUSTED: 'freetalk:exhausted',
  CHAT_HEARTBEAT: 'chat:heartbeat',
  DAILY_BONUS_READY: 'coins:daily-bonus-ready',

  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_MESSAGE_SEND: 'room:message:send',
  ROOM_MESSAGE_NEW: 'room:message:new',
  ROOM_PARTICIPANTS: 'room:participants',
  ROOM_VOICE_SIGNAL: 'room:voice:signal',
  ROOM_VOICE_STATE: 'room:voice:state',
  ROOM_CLOSED: 'room:closed',

  // Status / stories
  STATUS_NEW: 'status:new',
  STATUS_VIEWED: 'status:viewed',

  LEADERBOARD_UPDATED: 'leaderboard:updated',

  THEME_UPDATED: 'theme:updated',
  SETTINGS_UPDATED: 'settings:updated',
  FORCE_LOGOUT: 'account:force-logout',
  ACCOUNT_SUSPENDED: 'account:suspended',

  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_COUNT_UPDATED: 'notification:count:updated',

  ERROR: 'app:error',
});
