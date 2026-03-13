import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useCommunity } from "../../lib/hooks/use-community";
import { PostCard } from "../../components/community/PostCard";
import { CreatePostSheet } from "../../components/community/CreatePostSheet";
import type { CreatePostInput } from "../../lib/types";

const PHASES = ["Acute Phase", "Early Rehab", "Strengthening", "Return to Activity"] as const;
type Phase = (typeof PHASES)[number];

export default function CommunityScreen() {
  const router = useRouter();
  const { posts, loading, refreshing, hasMore, userId, createPost, deletePost, toggleUpvote, loadMore, refresh } =
    useCommunity();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePhase, setActivePhase] = useState<Phase | null>(null);

  const filteredPosts = useMemo(() => {
    let result = posts;

    if (activePhase) {
      result = result.filter((p) => p.author_phase === activePhase);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q)
      );
    }

    return result;
  }, [posts, activePhase, searchQuery]);

  async function handleSubmit(input: CreatePostInput) {
    await createPost(input);
  }

  function renderListHeader() {
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 12,
            gap: 8,
          }}
        >
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: Colors.text }}
            placeholder="Search posts…"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Phase filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
        >
          <TouchableOpacity
            onPress={() => setActivePhase(null)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 100,
              backgroundColor: activePhase === null ? Colors.primary : Colors.surface,
              borderWidth: 1,
              borderColor: activePhase === null ? Colors.primary : Colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: activePhase === null ? "#FFFFFF" : Colors.textSecondary,
              }}
            >
              All
            </Text>
          </TouchableOpacity>

          {PHASES.map((phase) => {
            const active = activePhase === phase;
            return (
              <TouchableOpacity
                key={phase}
                onPress={() => setActivePhase(active ? null : phase)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 100,
                  backgroundColor: active ? Colors.secondary : Colors.surface,
                  borderWidth: 1,
                  borderColor: active ? Colors.secondary : Colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? "#FFFFFF" : Colors.textSecondary,
                  }}
                >
                  {phase}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  function renderEmpty() {
    if (loading) return null;

    const hasFilters = !!activePhase || !!searchQuery.trim();
    if (hasFilters) {
      return (
        <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
          <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
          <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 16, marginBottom: 8 }}>
            No posts found
          </Text>
          <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: "center" }}>
            Try a different search or filter
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
        <Ionicons name="people-outline" size={56} color={Colors.textMuted} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: Colors.text,
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Be the first to post
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 40 }}>
          Share a milestone, ask a question, or drop a life hack for others recovering from ACL surgery.
        </Text>
      </View>
    );
  }

  function renderFooter() {
    if (!hasMore || posts.length === 0) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: "center" }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {loading && posts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={userId}
              onPress={() => router.push(`/community/${item.id}`)}
              onUpvote={() => toggleUpvote(item.id)}
              onDelete={() => deletePost(item.id)}
            />
          )}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowCreate(true)}
        style={{
          position: "absolute",
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: Colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <CreatePostSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}
