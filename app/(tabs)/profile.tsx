import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { registerForPushNotifications, scheduleDailyReminder } from "../../lib/notifications";
import { Colors } from "../../constants/colors";
import type { Profile, NotificationPreferences } from "../../lib/types";

export default function ProfileScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const [{ data: prof }, { data: prefs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).single(),
        supabase.from("notification_preferences").select("*").eq("user_id", userId!).single(),
      ]);
      setProfile(prof as Profile);
      setNotifPrefs(prefs as NotificationPreferences);
      if (prefs?.daily_reminder_time) {
        const [h, m] = (prefs.daily_reminder_time as string).split(":").map(Number);
        registerForPushNotifications(userId!).then(() => scheduleDailyReminder(h, m));
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  async function toggleEveningNudge(value: boolean) {
    if (!notifPrefs) return;
    setSavingNotif(true);
    await supabase
      .from("notification_preferences")
      .update({ evening_nudge_enabled: value })
      .eq("id", notifPrefs.id);
    setNotifPrefs({ ...notifPrefs, evening_nudge_enabled: value });
    setSavingNotif(false);
  }

  async function handleExportData() {
    if (!userId) return;
    const [{ data: logs }, { data: roms }, { data: achievements }] = await Promise.all([
      supabase.from("daily_logs").select("*").eq("user_id", userId),
      supabase.from("rom_measurements").select("*").eq("user_id", userId),
      supabase.from("user_achievements").select("*, content(*)").eq("user_id", userId),
    ]);

    const exportData = {
      profile,
      daily_logs: logs,
      rom_measurements: roms,
      achievements,
      exported_at: new Date().toISOString(),
    };

    await Share.share({
      message: JSON.stringify(exportData, null, 2),
      title: "KneeBack Export",
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;
            await supabase.from("profiles").delete().eq("id", userId);
            await supabase.auth.signOut();
          },
        },
      ]
    );
  }

  function surgeryDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function daysSince(dateStr: string): number {
    return Math.max(0, Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 86400000
    ));
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {/* Header */}
      <View className="items-center py-6 mb-4">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: Colors.primary + "20" }}
        >
          <Text className="text-3xl font-bold text-primary">
            {profile?.username?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text className="text-xl font-bold" style={{ color: "#2D2D2D" }}>
          {profile?.username ?? "—"}
        </Text>
        {profile?.surgery_date && (
          <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }}>
            Day {daysSince(profile.surgery_date)} of recovery
          </Text>
        )}
      </View>

      {/* Surgery Info */}
      <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>Surgery Details</Text>
        <InfoRow label="Surgery Date" value={profile?.surgery_date ? surgeryDateLabel(profile.surgery_date) : "—"} />
        <InfoRow label="Graft Type" value={profile?.graft_type ? capitalize(profile.graft_type) : "—"} />
        <InfoRow label="Knee" value={profile?.knee_side ? capitalize(profile.knee_side) : "—"} last />
      </View>

      {/* Notifications */}
      {notifPrefs && (
        <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>Notifications</Text>
          <InfoRow label="Daily reminder" value={notifPrefs.daily_reminder_time?.slice(0, 5) ?? "—"} />
          <View className="flex-row items-center justify-between py-3">
            <Text style={{ color: "#2D2D2D" }}>Evening nudge</Text>
            <Switch
              value={notifPrefs.evening_nudge_enabled}
              onValueChange={toggleEveningNudge}
              trackColor={{ true: Colors.primary }}
              disabled={savingNotif}
            />
          </View>
        </View>
      )}

      {/* Actions */}
      <View className="bg-surface border border-border rounded-2xl mb-4 overflow-hidden">
        <ActionRow
          icon="download-outline"
          label="Export My Data"
          onPress={handleExportData}
        />
        <ActionRow
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleSignOut}
        />
        <ActionRow
          icon="trash-outline"
          label="Delete Account"
          onPress={handleDeleteAccount}
          destructive
          last
        />
      </View>
    </ScrollView>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row justify-between py-3 ${!last ? "border-b border-border" : ""}`}>
      <Text style={{ color: "#6B6B6B" }}>{label}</Text>
      <Text className="font-semibold" style={{ color: "#2D2D2D" }}>{value}</Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  destructive,
  last,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const color = destructive ? Colors.error : "#2D2D2D";
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-4 ${!last ? "border-b border-border" : ""}`}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color={color} />
      <Text className="ml-3 text-base" style={{ color }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#A0A0A0" style={{ marginLeft: "auto" }} />
    </TouchableOpacity>
  );
}
