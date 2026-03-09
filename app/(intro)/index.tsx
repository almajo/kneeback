import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ViewToken,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slide1Illustration from "../../components/intro/Slide1Illustration";
import Slide2Illustration from "../../components/intro/Slide2Illustration";
import Slide3Illustration from "../../components/intro/Slide3Illustration";
import Slide4Illustration from "../../components/intro/Slide4Illustration";

const SLIDES = [
  {
    id: "1",
    headline: "Sad to see you here.",
    subtext: "But we're already excited to cheer you out the door.",
    Illustration: Slide1Illustration,
  },
  {
    id: "2",
    headline: "Every degree matters.",
    subtext:
      "Track your exercises, log your ROM, hit milestones, and celebrate every win — no matter how small.",
    Illustration: Slide2Illustration,
  },
  {
    id: "3",
    headline: "We're not your doctor.",
    subtext:
      "KneeBack provides guided support and habit-building — not medical advice. Always follow your physio's plan.",
    Illustration: Slide3Illustration,
  },
  {
    id: "4",
    headline: "Ready to start your comeback?",
    subtext: null,
    Illustration: Slide4Illustration,
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

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  );

  const goNext = useCallback(() => {
    const next = currentIndex + 1;
    setCurrentIndex(next);
    flatListRef.current?.scrollToOffset({ offset: next * width, animated: true });
  }, [currentIndex]);

  const handleSignIn = useCallback(async () => {
    await completeIntro();
    router.replace("/(auth)/sign-in");
  }, [router]);

  const handleCreateAccount = useCallback(async () => {
    await completeIntro();
    router.replace("/(auth)/sign-up");
  }, [router]);

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
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        renderItem={({ item }) => {
          const { headline, subtext, Illustration } = item;
          return (
            <View style={[styles.slide, { width }]}>
              <View style={styles.illustrationContainer}>
                <Illustration size={illustrationSize} />
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
            <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCreateAccount}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={goNext}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
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
  secondaryButton: {
    backgroundColor: "#2EC4B6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
