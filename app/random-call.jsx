import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../src/hooks/useAuth.jsx';
import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { useSocket } from '../src/hooks/useSocket.jsx';
import { Avatar } from '../src/components/ui.jsx';
import { useToast } from '../src/components/Toast.jsx';
import { Ionicons } from '@expo/vector-icons';
import { useScreenCaptureProtection } from '../src/hooks/useScreenCaptureProtection.js';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function RandomCallScreen() {
  useScreenCaptureProtection();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { socket } = useSocket();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  // State: 'idle' | 'searching' | 'connected'
  const [callState, setCallState] = useState('idle');
  const [isVideoMode, setIsVideoMode] = useState(false); // Voice call is default 1st
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Active Peer & Session info
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [matchedPeer, setMatchedPeer] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  // WebRTC & Media References
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Animated Radar Circle Values
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;

  // Start radar animation loops
  useEffect(() => {
    if (callState === 'searching') {
      const createPulse = (anim, delay) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
        );

      const anim1 = createPulse(pulseAnim1, 0);
      const anim2 = createPulse(pulseAnim2, 800);
      const anim3 = createPulse(pulseAnim3, 1600);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    }
  }, [callState, pulseAnim1, pulseAnim2, pulseAnim3]);

  // Request Location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {
        // Fallback gracefully without throwing
      }
    })();
  }, []);

  // Format call duration MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer for connected call
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Cleanup WebRTC PeerConnection & Media Streams
  const cleanupMedia = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  // Initialize Local Media Stream with progressive fallbacks
  const initLocalStream = async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return null;
    }

    // Tier 1: Try full Video + Audio (if in video mode)
    if (isVideoMode) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        return stream;
      } catch {
        // Fallback to audio only if webcam is unavailable or in use
      }
    }

    // Tier 2: Try Audio Only (Voice Mode)
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      localStreamRef.current = audioStream;
      setIsVideoOff(true);
      return audioStream;
    } catch {
      // Fallback to virtual stream if hardware mic is unavailable
    }

    // Tier 3: Virtual Silent Audio Track (keeps WebRTC peer connection active)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const virtualStream = dst.stream;
        localStreamRef.current = virtualStream;
        setIsVideoOff(true);
        return virtualStream;
      }
    } catch {
      // Virtual stream error
    }

    toast.info('Connecting call in virtual avatar mode.');
    return null;
  };

  // Setup PeerConnection & Signaling
  const setupPeerConnection = async (callSessionId, isInitiator, stream) => {
    if (typeof RTCPeerConnection === 'undefined') return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    // Send local ICE candidates to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('random_call:signal', {
          callSessionId,
          data: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    // If initiator, create and send Offer
    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideoMode,
        });
        await pc.setLocalDescription(offer);

        socket.emit('random_call:signal', {
          callSessionId,
          data: { type: 'offer', sdp: offer },
        });
      } catch {
        // Offer creation error handled silently
      }
    }
  };

  // Handle incoming signaling messages from peer
  const handleIncomingSignal = useCallback(
    async ({ callSessionId, data }) => {
      const pc = peerConnectionRef.current;
      if (!pc || !data) return;

      try {
        if (data.type === 'offer' && typeof RTCSessionDescription !== 'undefined') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (socket) {
            socket.emit('random_call:signal', {
              callSessionId,
              data: { type: 'answer', sdp: answer },
            });
          }
        } else if (data.type === 'answer' && typeof RTCSessionDescription !== 'undefined') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'candidate' && typeof RTCIceCandidate !== 'undefined') {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch {
        // Signaling error handled silently
      }
    },
    [socket],
  );

  // Start Searching
  const handleStartSearch = useCallback(() => {
    cleanupMedia();
    setCallState('searching');
    setMatchedPeer(null);
    setActiveSessionId(null);

    if (socket) {
      socket.emit('random_call:start_search', {
        location: userLocation,
        isVideo: isVideoMode,
      });
    }
  }, [cleanupMedia, socket, userLocation, isVideoMode]);

  // Socket Event Listeners for Matchmaking & WebRTC Signaling
  useEffect(() => {
    if (!socket) return;

    const onMatched = async (payload) => {
      setActiveSessionId(payload.callSessionId);
      setMatchedPeer(payload.peer);
      setCallState('connected');

      // Initialize media & WebRTC
      const stream = await initLocalStream();
      await setupPeerConnection(payload.callSessionId, payload.isInitiator, stream);
    };

    const onEnded = () => {
      cleanupMedia();
      toast.info('Your friend disconnected.');
      // Auto-search next friend
      handleStartSearch();
    };

    socket.on('random_call:matched', onMatched);
    socket.on('random_call:signal', handleIncomingSignal);
    socket.on('random_call:ended', onEnded);

    return () => {
      socket.off('random_call:matched', onMatched);
      socket.off('random_call:signal', handleIncomingSignal);
      socket.off('random_call:ended', onEnded);
    };
  }, [socket, isVideoMode, handleIncomingSignal, cleanupMedia, handleStartSearch]);

  // Cancel Searching
  const handleCancelSearch = () => {
    if (socket) {
      socket.emit('random_call:cancel_search');
    }
    cleanupMedia();
    setCallState('idle');
  };

  // Next / Skip to another friend
  const handleNext = () => {
    cleanupMedia();
    setCallState('searching');
    setMatchedPeer(null);
    setActiveSessionId(null);

    if (socket) {
      socket.emit('random_call:next', {
        location: userLocation,
        isVideo: isVideoMode,
      });
    }
  };

  // End Call and exit to home
  const handleEndCall = () => {
    if (socket) {
      socket.emit('random_call:end');
    }
    cleanupMedia();
    setCallState('idle');
    router.back();
  };

  // Toggle Mic
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    } else {
      setIsMicMuted(!isMicMuted);
    }
  };

  // Toggle Video
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ========================================================================= */}
      {/* 1. IDLE / SETUP SCREEN */}
      {/* ========================================================================= */}
      {callState === 'idle' && (
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 20,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Top Header Bar */}
          <View className="w-full flex-row items-center justify-between">
            {/* Attractive Theme-Styled Back Button */}
            <Pressable
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)');
              }}
              className="h-10 w-10 items-center justify-center rounded-2xl border shadow-sm active:scale-95 transition"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>

            {/* Header Badge */}
            <View
              className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-sm"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text
                className="text-xs font-black tracking-widest uppercase"
                style={{ color: colors.textPrimary }}
              >
                NEARBY RANDOM CALL
              </Text>
            </View>
            <View className="w-10" />
          </View>

          {/* Center Content & Explanation */}
          <View className="items-center w-full max-w-sm px-1">
            {/* Glowing Call Icon */}
            <View
              className="h-20 w-20 rounded-3xl items-center justify-center mb-4 border-2 shadow-2xl"
              style={{
                backgroundColor: colors.primary + '18',
                borderColor: colors.primary,
              }}
            >
              <Ionicons name="call" size={32} color={colors.primary} />
            </View>

            <Text
              className="text-2xl font-black text-center tracking-tight"
              style={{ color: colors.textPrimary }}
            >
              Nearby Random Call
            </Text>

            <Text
              className="text-xs text-center mt-1.5 mb-3 leading-relaxed"
              style={{ color: colors.textSecondary }}
            >
              Connect instantly in a private 1-on-1 voice or video call with people closest to your
              current location.
            </Text>

            {/* Inspiring Connection Quote */}
            <View
              className="mb-4 px-3.5 py-2.5 rounded-2xl border shadow-sm w-full"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <Text
                className="text-xs italic text-center leading-relaxed"
                style={{ color: colors.textSecondary }}
              >
                “Every great connection begins with a simple ‘Hello’.” ✨
              </Text>
            </View>

            {/* Mode Selection Cards: 1st Voice Call (Default), 2nd Video Call */}
            <View className="flex-row items-center gap-2.5 w-full mb-3">
              {/* 1st: Voice Call Card (Default) */}
              <Pressable
                onPress={() => setIsVideoMode(false)}
                className="flex-1 p-3.5 rounded-2xl border transition items-center shadow-sm active:scale-95"
                style={{
                  backgroundColor: !isVideoMode
                    ? colors.primary + '15'
                    : colors.surface,
                  borderColor: !isVideoMode
                    ? colors.primary
                    : colors.border,
                }}
              >
                <View
                  className="h-10 w-10 rounded-full items-center justify-center mb-2"
                  style={{
                    backgroundColor: !isVideoMode
                      ? colors.primary
                      : colors.surfaceAlt || colors.border,
                  }}
                >
                  <Ionicons
                    name="mic"
                    size={18}
                    color={!isVideoMode ? (colors.onPrimary || '#FFFFFF') : colors.textSecondary}
                  />
                </View>
                <Text
                  className="text-xs font-black"
                  style={{ color: colors.textPrimary }}
                >
                  Voice Call
                </Text>
                <Text
                  className="text-[10px] mt-0.5 text-center"
                  style={{ color: colors.textSecondary }}
                >
                  Crystal-clear audio
                </Text>
              </Pressable>

              {/* 2nd: Video Call Card */}
              <Pressable
                onPress={() => setIsVideoMode(true)}
                className="flex-1 p-3.5 rounded-2xl border transition items-center shadow-sm active:scale-95"
                style={{
                  backgroundColor: isVideoMode
                    ? colors.primary + '15'
                    : colors.surface,
                  borderColor: isVideoMode
                    ? colors.primary
                    : colors.border,
                }}
              >
                <View
                  className="h-10 w-10 rounded-full items-center justify-center mb-2"
                  style={{
                    backgroundColor: isVideoMode
                      ? colors.primary
                      : colors.surfaceAlt || colors.border,
                  }}
                >
                  <Ionicons
                    name="videocam"
                    size={18}
                    color={isVideoMode ? (colors.onPrimary || '#FFFFFF') : colors.textSecondary}
                  />
                </View>
                <Text
                  className="text-xs font-black"
                  style={{ color: colors.textPrimary }}
                >
                  Video Call
                </Text>
                <Text
                  className="text-[10px] mt-0.5 text-center"
                  style={{ color: colors.textSecondary }}
                >
                  Face-to-face HD live
                </Text>
              </Pressable>
            </View>

            {/* Feature Badges List */}
            <View
              className="w-full flex-row items-center justify-between px-3.5 py-2.5 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="navigate-circle" size={15} color={colors.success || '#10B981'} />
                <Text className="text-[11px] font-semibold" style={{ color: colors.textSecondary }}>
                  Nearest First
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="shield-checkmark" size={15} color={colors.info || '#3B82F6'} />
                <Text className="text-[11px] font-semibold" style={{ color: colors.textSecondary }}>
                  Encrypted P2P
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="flash" size={15} color={colors.warning || '#F59E0B'} />
                <Text className="text-[11px] font-semibold" style={{ color: colors.textSecondary }}>
                  Instant Skip
                </Text>
              </View>
            </View>
          </View>

          {/* Start Search CTA Button */}
          <Pressable
            onPress={handleStartSearch}
            className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-2xl active:scale-95 transition"
            style={{
              backgroundColor: colors.primary,
              boxShadow: `0 8px 24px -4px ${colors.primary}60`,
            }}
          >
            <Ionicons name="call" size={20} color={colors.onPrimary || '#FFFFFF'} />
            <Text
              className="text-base font-black tracking-wide"
              style={{ color: colors.onPrimary || '#FFFFFF' }}
            >
              Start Random Call Now
            </Text>
          </Pressable>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 2. RADAR SEARCHING SCREEN */}
      {/* ========================================================================= */}
      {callState === 'searching' && (
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Top Bar */}
          <View className="w-full flex-row items-center justify-between">
            <Pressable
              onPress={handleCancelSearch}
              className="h-10 w-10 items-center justify-center rounded-2xl border shadow-sm"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
            <View
              className="flex-row items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <View className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <Text
                className="text-xs font-bold tracking-wider"
                style={{ color: colors.textPrimary }}
              >
                RADAR SCANNING
              </Text>
            </View>
            <View className="w-10" />
          </View>

          {/* Animated Radar Pulse Rings */}
          <View className="items-center justify-center my-auto">
            {/* Outer Ring 3 */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 280,
                height: 280,
                borderRadius: 140,
                backgroundColor: colors.primary || '#FF4E88',
                opacity: pulseAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0],
                }),
                transform: [
                  {
                    scale: pulseAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1.4],
                    }),
                  },
                ],
              }}
            />

            {/* Outer Ring 2 */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: colors.primary || '#FF4E88',
                opacity: pulseAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 0],
                }),
                transform: [
                  {
                    scale: pulseAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1.3],
                    }),
                  },
                ],
              }}
            />

            {/* Outer Ring 1 */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: colors.primary || '#FF4E88',
                opacity: pulseAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.55, 0],
                }),
                transform: [
                  {
                    scale: pulseAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1.2],
                    }),
                  },
                ],
              }}
            />

            {/* Center User Avatar */}
            <View
              className="h-24 w-24 rounded-full items-center justify-center border-4 shadow-2xl z-10"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.primary,
              }}
            >
              <Avatar name={user?.name || 'Me'} src={user?.avatarUrl} size="lg" />
            </View>

            <Text
              className="text-lg font-black mt-8 tracking-wide text-center"
              style={{ color: colors.textPrimary }}
            >
              Scanning For Nearest Friend...
            </Text>
            <Text
              className="text-xs mt-1 text-center"
              style={{ color: colors.textSecondary }}
            >
              Matching with active friends closest to your coordinates
            </Text>
          </View>

          {/* DROP CALL BUTTON */}
          <Pressable
            onPress={handleCancelSearch}
            className="w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 border shadow-xl active:scale-95 transition"
            style={{
              backgroundColor: colors.danger || '#F5325B',
              borderColor: (colors.danger || '#F5325B') + '80',
            }}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text className="text-sm font-black text-white tracking-wider">Drop Call</Text>
          </Pressable>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 3. CONNECTED LIVE WEBRTC CALL SCREEN */}
      {/* ========================================================================= */}
      {callState === 'connected' && (
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Remote Video / Avatar Container (Full Screen) */}
          <View style={{ flex: 1, backgroundColor: '#13111C', overflow: 'hidden' }}>
            {Platform.OS === 'web' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isVideoMode ? 'block' : 'none',
                }}
              />
            ) : null}

            {/* Fallback Audio Wave Avatar View */}
            {(!isVideoMode || isVideoOff) && (
              <View className="flex-1 items-center justify-center">
                {/* Glowing Ripple Around Peer Avatar */}
                <View className="relative items-center justify-center">
                  <View
                    className="absolute h-48 w-48 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: colors.primary || '#FF4E88' }}
                  />
                  <View
                    className="h-36 w-36 rounded-full items-center justify-center border-4 shadow-2xl z-10"
                    style={{
                      backgroundColor: '#1E1B2E',
                      borderColor: colors.primary || '#FF4E88',
                    }}
                  >
                    <Avatar
                      name={matchedPeer?.name || 'Friend'}
                      src={matchedPeer?.avatarUrl}
                      size="xl"
                    />
                  </View>
                </View>

                <Text className="text-2xl font-black text-white mt-6 tracking-tight">
                  {matchedPeer?.name || 'Friend'}
                </Text>

                {/* Animated Voice Indicator */}
                <View className="flex-row items-center gap-2 mt-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                  <View className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Text className="text-xs font-bold text-emerald-400">
                    Voice Connected • {formatDuration(callDuration)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Local User Video (Picture-in-Picture Floating Box) */}
          {isVideoMode && (
            <View
              className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-30"
              style={{ backgroundColor: '#000' }}
            >
              {Platform.OS === 'web' ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror local preview
                  }}
                />
              ) : null}
            </View>
          )}

          {/* Top Bar: Peer Name, Proximity Badge & Duration */}
          <View
            style={{ paddingTop: insets.top + 12 }}
            className="absolute top-0 left-0 right-0 px-4 flex-row items-center justify-between z-20"
          >
            <View
              className="flex-row items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-lg"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <Avatar
                name={matchedPeer?.name || 'Friend'}
                src={matchedPeer?.avatarUrl}
                size="sm"
              />
              <View>
                <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>
                  {matchedPeer?.name || 'Friend'}
                </Text>
                <Text className="text-[10px] font-semibold" style={{ color: colors.success || '#10B981' }}>
                  📍 {matchedPeer?.distance || 'Nearby Match'}
                </Text>
              </View>
            </View>

            <View
              className="px-3.5 py-1.5 rounded-full border shadow-lg"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <Text className="text-xs font-mono font-bold" style={{ color: colors.textPrimary }}>
                {formatDuration(callDuration)}
              </Text>
            </View>
          </View>

          {/* Floating Luxury Call Controls Island Dock */}
          <View
            style={{ paddingBottom: insets.bottom + 16 }}
            className="absolute bottom-0 left-0 right-0 px-4 items-center z-30"
          >
            <View
              className="flex-row items-center justify-between w-full max-w-sm px-4 py-3 rounded-full border shadow-2xl"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              {/* Mute Mic Button */}
              <Pressable
                onPress={handleToggleMic}
                className="h-12 w-12 rounded-full items-center justify-center border transition active:scale-95"
                style={{
                  backgroundColor: isMicMuted
                    ? (colors.warning || '#F5A524') + '20'
                    : colors.surfaceAlt || colors.border,
                  borderColor: isMicMuted
                    ? (colors.warning || '#F5A524')
                    : colors.border,
                }}
              >
                <Ionicons
                  name={isMicMuted ? 'mic-off' : 'mic'}
                  size={20}
                  color={isMicMuted ? (colors.warning || '#F5A524') : colors.textPrimary}
                />
              </Pressable>

              {/* Next / Skip Friend Button (Vibrant Pill with Flash & Glow) */}
              <Pressable
                onPress={handleNext}
                className="flex-row items-center gap-2 px-6 py-3 rounded-full shadow-lg active:scale-95"
                style={{
                  backgroundColor: colors.primary,
                  boxShadow: `0 6px 20px -2px ${colors.primary}60`,
                }}
              >
                <Ionicons name="flash" size={15} color={colors.onPrimary || '#FFFFFF'} />
                <Text
                  className="text-sm font-black tracking-widest uppercase"
                  style={{ color: colors.onPrimary || '#FFFFFF' }}
                >
                  NEXT
                </Text>
                <Ionicons name="play-forward" size={13} color={colors.onPrimary || '#FFFFFF'} />
              </Pressable>

              {/* Toggle Video Button */}
              {isVideoMode && (
                <Pressable
                  onPress={handleToggleVideo}
                  className="h-12 w-12 rounded-full items-center justify-center border transition active:scale-95"
                  style={{
                    backgroundColor: isVideoOff
                      ? (colors.warning || '#F5A524') + '20'
                      : colors.surfaceAlt || colors.border,
                    borderColor: isVideoOff
                      ? (colors.warning || '#F5A524')
                      : colors.border,
                  }}
                >
                  <Ionicons
                    name={isVideoOff ? 'videocam-off' : 'videocam'}
                    size={20}
                    color={isVideoOff ? (colors.warning || '#F5A524') : colors.textPrimary}
                  />
                </Pressable>
              )}

              {/* End Call Button */}
              <Pressable
                onPress={handleEndCall}
                className="h-12 w-12 rounded-full items-center justify-center border shadow-lg active:scale-95"
                style={{
                  backgroundColor: colors.danger || '#F5325B',
                  borderColor: (colors.danger || '#F5325B') + '80',
                }}
              >
                <Ionicons
                  name="call"
                  size={20}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
