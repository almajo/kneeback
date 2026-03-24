import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthModal } from "../../components/AuthModal";
import { DataConflictModal } from "../../components/DataConflictModal";
import { pushAll, pullAll } from "../../lib/db/sync/sync-engine";
import { detectLocalData, detectCloudData } from "../../lib/db/sync/data-detection";
import { updateProfile } from "../../lib/db/repositories/profile-repo";
import { purgeAllUserData } from "../../lib/db/purge-user-data";

const SLIDES = [
  {
    id: "1",
    headline: "Sad to see you here.",
    subtext: "But we're already excited to cheer you out the door.",
    image: require("../../assets/images/slide1.png"),
  },
  {
    id: "2",
    headline: "Every degree matters.",
    subtext:
      "Track your exercises, log your ROM, hit milestones, and celebrate every win — no matter how small.",
    image: require("../../assets/images/slide2.png"),
  },
  {
    id: "3",
    headline: "We're not your doctor.",
    subtext:
      "KneeBack provides guided support and habit-building — not medical advice. Always follow your physio's plan.",
    image: require("../../assets/images/slide3.png"),
  },
  {
    id: "4",
    headline: "Ready to start your comeback?",
    subtext: "Your data stays on your device — fully local, fully private.",
    image: require("../../assets/images/slide4.png"),
  },
];

async function completeIntro() {
  await AsyncStorage.setItem("has_seen_intro", "true");
}

export default function IntroScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const illustrationSize = Math.min(280, width * 0.6, height * 0.32);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const startIndexRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);

  // Auth / sync state
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [conflictUserId, setConflictUserId] = useState<string | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  const handleScrollBeginDrag = useCallback(() => {
    startIndexRef.current = currentIndex;
  }, [currentIndex]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      const clamped = Math.max(
        startIndexRef.current - 1,
        Math.min(startIndexRef.current + 1, rawIndex)
      );
      const finalIndex = Math.max(0, Math.min(SLIDES.length - 1, clamped));
      if (finalIndex !== rawIndex) {
        flatListRef.current?.scrollToIndex({ index: finalIndex, animated: true });
      }
      setCurrentIndex(finalIndex);
    },
    [width]
  );

  const goNext = useCallback(() => {
    const next = currentIndex + 1;
    setCurrentIndex(next);
    startIndexRef.current = next;
    if (Platform.OS === "web") {
      isProgrammaticScrollRef.current = true;
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, 500);
    }
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
  }, [currentIndex]);

  // Web: attach a native scroll listener because onMomentumScrollEnd /
  // onScrollEndDrag are not fired by React Native Web on mouse/pointer scroll.
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const node = (flatListRef.current as any)?.getScrollableNode?.() as HTMLElement | null;
    if (!node) return;

    let isSnapping = false;

    const onPointerDown = () => {
      startIndexRef.current = Math.round(node.scrollLeft / width);
    };

    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      if (isSnapping || isProgrammaticScrollRef.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const rawIndex = Math.round(node.scrollLeft / width);
        const clamped = Math.max(
          startIndexRef.current - 1,
          Math.min(startIndexRef.current + 1, rawIndex)
        );
        const finalIndex = Math.max(0, Math.min(SLIDES.length - 1, clamped));
        setCurrentIndex(finalIndex);
        if (finalIndex !== rawIndex) {
          isSnapping = true;
          node.scrollTo({ left: finalIndex * width, behavior: "smooth" });
          setTimeout(() => { isSnapping = false; }, 400);
        }
      }, 80);
    };

    node.addEventListener("pointerdown", onPointerDown, { passive: true });
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [width]);

  const handleGetStarted = useCallback(async () => {
    await completeIntro();
    router.replace("/(onboarding)/surgery-details");
  }, [router]);

  async function handleAuthSuccess(userId: string) {
    setAuthModalVisible(false);
    setSyncing(true);

    try {
      const [hasLocalData, hasCloudData] = await Promise.all([
        detectLocalData(),
        detectCloudData(userId),
      ]);

      if (hasLocalData && hasCloudData) {
        setConflictUserId(userId);
        setConflictModalVisible(true);
        return;
      }

      const now = new Date().toISOString();

      if (hasLocalData) {
        const push = await pushAll(userId);
        if (push.error) {
          console.error("[intro/handleAuthSuccess] push failed:", push.error);
        }
        await updateProfile({ supabase_user_id: userId, last_synced_at: now });
        await completeIntro();
        router.replace("/(onboarding)/surgery-details");
      } else if (hasCloudData) {
        const pull = await pullAll(userId);
        if (pull.error) {
          console.error("[intro/handleAuthSuccess] pull failed:", pull.error);
        }
        await updateProfile({ supabase_user_id: userId, last_synced_at: now });
        await completeIntro();
        router.replace("/(tabs)/today");
      } else {
        // New account, no data on either side — continue to onboarding
        await completeIntro();
        router.replace("/(onboarding)/surgery-details");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleUseCloudData() {
    if (!conflictUserId) return;
    setConflictLoading(true);
    try {
      await purgeAllUserData();
      const pull = await pullAll(conflictUserId);
      if (pull.error) {
        console.error("[intro/handleUseCloudData] pull failed:", pull.error);
      }
      const now = new Date().toISOString();
      await updateProfile({ supabase_user_id: conflictUserId, last_synced_at: now });
      await completeIntro();
      router.replace("/(tabs)/today");
    } finally {
      setConflictLoading(false);
      setConflictModalVisible(false);
      setConflictUserId(null);
    }
  }

  async function handleKeepLocalData() {
    if (!conflictUserId) return;
    setConflictLoading(true);
    try {
      const push = await pushAll(conflictUserId);
      if (push.error) {
        console.error("[intro/handleKeepLocalData] push failed:", push.error);
      }
      const now = new Date().toISOString();
      await updateProfile({ supabase_user_id: conflictUserId, last_synced_at: now });
      await completeIntro();
      router.replace("/(onboarding)/surgery-details");
    } finally {
      setConflictLoading(false);
      setConflictModalVisible(false);
      setConflictUserId(null);
    }
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        renderItem={({ item }) => {
          const { headline, subtext } = item;
          const image = (item as any).image;
          return (
            <View style={[styles.slide, { width }]}>
              <View style={styles.illustrationContainer}>
                <Image
                  source={image}
                  style={{ width: illustrationSize, height: illustrationSize }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.headline}>{headline}</Text>
              {subtext ? (
                <Text style={styles.subtext}>{subtext}</Text>
              ) : null}
            </View>
          );
        }}
      />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        {isLast ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAuthModalVisible(true)}
              disabled={syncing}
              style={styles.signInButton}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Text style={styles.signInText}>Already have an account? Sign in</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={goNext}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={handleAuthSuccess}
      />
      <DataConflictModal
        visible={conflictModalVisible}
        onUseCloud={handleUseCloudData}
        onKeepLocal={handleKeepLocalData}
        loading={conflictLoading}
        onDismiss={() => {
          setConflictModalVisible(false);
          setConflictUserId(null);
          setSyncing(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF7",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  illustrationContainer: {
    marginBottom: 20,
  },
  headline: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 36,
  },
  subtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    backgroundColor: "#FF6B35",
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: "#E8E0D8",
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  signInButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  signInText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
