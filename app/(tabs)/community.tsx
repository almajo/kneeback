import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useCommunity } from "../../lib/hooks/use-community";
import { PostCard } from "../../components/community/PostCard";
import { CreatePostSheet } from "../../components/community/CreatePostSheet";
import type { CreatePostInput } from "../../lib/types";

export default function CommunityScreen() {
  const router = useRouter();
  const { posts, loading, refreshing, hasMore, createPost, toggleUpvote, loadMore, refresh } =
    useCommunity();
  const [showCreate, setShowCreate] = useState(false);

  async function handleSubmit(input: CreatePostInput) {
    await createPost(input);
  }

  function renderEmpty() {
    if (loading) return null;
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
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => router.push(`/community/${item.id}`)}
              onUpvote={() => toggleUpvote(item.id)}
            />
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100, flexGrow: 1 }}
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
