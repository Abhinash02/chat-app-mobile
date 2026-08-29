# Vibe Chat — Mobile App

React Native app built with Expo SDK 57 and styled with NativeWind (Tailwind for
React Native).

## Running it

```bash
npm install
cp .env.example .env
npm start           # scan the QR code with Expo Go
```

The backend must be running first — start it and seed it before opening the app.

### On a real phone

`localhost` on a phone means the phone itself, so set your machine's LAN address:

```bash
# .env
EXPO_PUBLIC_API_URL=http://192.168.1.5:5000
```

Find yours with `hostname -I` (Linux), `ipconfig getifaddr en0` (macOS) or
`ipconfig` (Windows), and keep the phone on the same Wi-Fi.

**Push notifications need a development build.** Expo Go cannot receive them on
Android from SDK 53 onward. Everything else — chat, coins, rooms, games, sounds —
works in Expo Go.

```bash
npx expo run:android      # or run:ios on a Mac
```

| Script | Purpose |
| --- | --- |
| `npm start` | Metro bundler |
| `npm run android` / `ios` | Open on a connected device or emulator |
| `npm run lint` | ESLint |

## Screens

```
app/
├── _layout.jsx              Providers, in the order they depend on each other
├── index.jsx                Launch gate — where to send you
├── (auth)/                  welcome · login · register · verify · forgot-password
├── (tabs)/                  discover · chats · rooms · games · profile
├── chat/[conversationId]    One conversation
├── room/[roomId]            One live room
├── coins.jsx                Buy coins, claim the daily bonus
├── leaderboard.jsx          Global game leaderboard
└── settings.jsx             Notifications, privacy, sign out
```

## Colours come from the server

An administrator picks the app's palette, and it changes without a release. So
colours are **not** Tailwind classes — a Tailwind class is a build-time string,
and these values are not known until the server answers.

```jsx
// Tailwind does layout, spacing, type. The theme does colour.
<View className="flex-row items-center gap-3 px-4 py-3"
      style={{ backgroundColor: colors.surface }} />
```

`src/theme/ThemeProvider.jsx` fetches the active theme and merges it over a
bundled fallback, so the app renders correctly before that request finishes,
keeps rendering if it never does, and never crashes on a theme that adds a
colour this build has never heard of. When an admin activates a new theme the
server pushes it over the socket and the app re-skins live.

## Realtime

One socket carries everything that must feel live: the coin counter, the
free-time countdown, presence dots, incoming messages and admin theme changes.

Every one of those has a REST equivalent, so a dropped socket degrades the app
to pull-to-refresh rather than breaking it. The connection reconnects when the
app returns to the foreground, because phones suspend sockets in the background
and a stale presence dot is worse than an obviously offline one.

### The free-time heartbeat

The 30-minute allowance should measure time actually spent chatting, not
wall-clock time since signup. So the chat screen emits a heartbeat every 15
seconds while it is open, and the **server** decides how much each tick is
worth. Ticks arriving faster than the configured interval are ignored, so the
app cannot drain or stretch the allowance by changing its own timer.

## Sounds

`assets/sounds/` holds three generated chimes — a message tone, a coin sparkle
and a quiet send tick. They are played through `src/hooks/useSounds.jsx`, which
holds app-wide players so a chime is not cut off when the screen that triggered
it unmounts.

Audio is decoration: every call fails silently, because a device that will not
play a chime must not take a screen down with it. The account's own
`soundEnabled` preference is applied locally the moment it is toggled.

Push notifications carry a sound name and an Android channel (`messages` for
chat, `announcements` for campaigns) so the OS plays the right tone and honours
per-channel settings. The in-app handler mutes the OS sound while the app is
open, since the socket already plays one — otherwise every message chimes twice.

## Sessions

Tokens live in the device keychain via `expo-secure-store`, not AsyncStorage,
which is unencrypted files on a rooted device.

A phone reopened after a week always has an expired access token, so refresh is
the normal path rather than an edge case. Concurrent 401s share one refresh
promise: refresh tokens rotate on use, and firing several at once looks like
token theft to the server and revokes the whole session.

A stored session is re-validated on launch. Only a rejected session signs the
user out — a dead network must not, or reopening the app on a train would lose
it.

## Known limitations

- **Voice in rooms is not wired to audio yet.** The server relays WebRTC
  signalling and the UI is there; connecting real audio needs a development
  build with a WebRTC module. Room text chat works fully.
- **Razorpay checkout needs its native SDK**, which a managed Expo build cannot
  load. UPI works today and covers GPay, PhonePe and Paytm; the app says so
  rather than offering a button that does nothing.
- **Only Quick Tap is playable.** The other four games are listed because the
  server scores them and they appear on the leaderboard — showing them greyed
  out is honest; hiding them would make the leaderboard confusing.
- **No offline queue.** A message sent with no connection fails and is handed
  back to the input rather than being stored and retried.
