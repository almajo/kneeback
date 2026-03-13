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
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { registerForPushNotifications, scheduleDailyReminder } from "../../lib/notifications";
import { Colors } from "../../constants/colors";
import type { Profile, NotificationPreferences, GraftType } from "../../lib/types";
import { PrivacyPolicyModal } from "../../components/PrivacyPolicyModal";

const GRAFT_TYPE_OPTIONS: { value: GraftType; label: string }[] = [
  { value: "patellar", label: "Patellar Tendon" },
  { value: "hamstring", label: "Hamstring" },
  { value: "quad", label: "Quad Tendon" },
  { value: "allograft", label: "Allograft" },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [editingReminder, setEditingReminder] = useState(false);
  const [editingGraftType, setEditingGraftType] = useState(false);
  const [savingGraftType, setSavingGraftType] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [reminderHour, setReminderHour] = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });

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
        setReminderHour(h);
        setReminderMinute(m);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setReminderDate(d);
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

  async function saveReminderTime(h = reminderHour, m = reminderMinute) {
    if (!notifPrefs) return;
    setSavingNotif(true);
    const timeStr = `${pad(h)}:${pad(m)}`;
    await supabase
      .from("notification_preferences")
      .update({ daily_reminder_time: timeStr })
      .eq("id", notifPrefs.id);
    setNotifPrefs({ ...notifPrefs, daily_reminder_time: timeStr });
    await scheduleDailyReminder(h, m);
    setEditingReminder(false);
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

  async function saveGraftType(graftType: GraftType) {
    if (!userId || !profile) return;
    setSavingGraftType(true);
    await supabase.from("profiles").update({ graft_type: graftType }).eq("id", userId);
    setProfile({ ...profile, graft_type: graftType });
    setEditingGraftType(false);
    setSavingGraftType(false);
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
            await supabase.rpc("delete_user");
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

        {/* Editable Graft Type */}
        <TouchableOpacity
          className="flex-row justify-between items-center py-3 border-b border-border"
          onPress={() => setEditingGraftType((v) => !v)}
        >
          <Text style={{ color: "#6B6B6B" }}>Graft Type</Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold" style={{ color: "#2D2D2D" }}>
              {profile?.graft_type
                ? (GRAFT_TYPE_OPTIONS.find((o) => o.value === profile.graft_type)?.label ?? capitalize(profile.graft_type))
                : "—"}
            </Text>
            <Ionicons
              name={editingGraftType ? "chevron-up" : "chevron-down"}
              size={14}
              color="#A0A0A0"
            />
          </View>
        </TouchableOpacity>
        {editingGraftType && (
          <View className="pb-2 pt-1">
            {GRAFT_TYPE_OPTIONS.map((option) => {
              const isSelected = profile?.graft_type === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  className={`flex-row items-center justify-between px-3 py-3 rounded-xl mb-1 ${isSelected ? "bg-primary" : "bg-background"}`}
                  onPress={() => saveGraftType(option.value)}
                  disabled={savingGraftType}
                >
                  <Text className="text-base" style={{ color: isSelected ? "#fff" : "#2D2D2D" }}>
                    {option.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  {savingGraftType && isSelected && <ActivityIndicator size="small" color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <InfoRow label="Knee" value={profile?.knee_side ? capitalize(profile.knee_side) : "—"} />

        {/* Manage Exercises */}
        <TouchableOpacity
          className="flex-row justify-between items-center py-3"
          onPress={() => router.push("/exercise-picker")}
        >
          <Text style={{ color: "#6B6B6B" }}>Exercise Plan</Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold" style={{ color: "#2D2D2D" }}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color="#A0A0A0" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      {notifPrefs && (
        <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>Notifications</Text>

          {/* Daily reminder row */}
          <TouchableOpacity
            className="flex-row justify-between items-center py-3 border-b border-border"
            onPress={() => setEditingReminder((v) => !v)}
          >
            <Text style={{ color: "#6B6B6B" }}>Daily reminder</Text>
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold" style={{ color: "#2D2D2D" }}>
                {notifPrefs.daily_reminder_time?.slice(0, 5) ?? "—"}
              </Text>
              <Ionicons
                name={editingReminder ? "chevron-up" : "chevron-down"}
                size={14}
                color="#A0A0A0"
              />
            </View>
          </TouchableOpacity>

          {/* Native time picker */}
          {editingReminder && (
            <View className="pb-2">
              {Platform.OS === "web" ? (
                <input
                  type="time"
                  value={`${pad(reminderHour)}:${pad(reminderMinute)}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    setReminderHour(h);
                    setReminderMinute(m);
                    const d = new Date();
                    d.setHours(h, m, 0, 0);
                    setReminderDate(d);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 16,
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    marginTop: 8,
                    marginBottom: 8,
                    outline: "none",
                    boxSizing: "border-box",
                    backgroundColor: "transparent",
                  }}
                />
              ) : (
                <DateTimePicker
                  value={reminderDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selected) => {
                    if (!selected) return;
                    setReminderDate(selected);
                    setReminderHour(selected.getHours());
                    setReminderMinute(selected.getMinutes());
                    if (Platform.OS === "android") {
                      saveReminderTime(selected.getHours(), selected.getMinutes());
                    }
                  }}
                />
              )}
              {Platform.OS !== "android" && (
                <TouchableOpacity
                  className={`bg-primary rounded-xl py-3 items-center mt-2 ${savingNotif ? "opacity-50" : ""}`}
                  onPress={() => saveReminderTime(reminderHour, reminderMinute)}
                  disabled={savingNotif}
                >
                  {savingNotif ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold">Save</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <View className="flex-row items-center justify-between py-3">
            <Text style={{ color: "#2D2D2D" }}>Evening nudge</Text>
            <Switch
              value={notifPrefs.evening_nudge_enabled}
              onValueChange={toggleEveningNudge}
              trackColor={{ false: Colors.borderLight, true: Colors.secondary }}
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
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() => setPrivacyVisible(true)}
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

      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </ScrollView>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-3 border-b border-border">
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
