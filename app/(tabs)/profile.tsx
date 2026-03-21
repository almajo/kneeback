import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { registerForPushNotifications, scheduleDailyReminder } from "../../lib/notifications";
import { Colors } from "../../constants/colors";
import { getProfile, updateProfile } from "../../lib/db/repositories/profile-repo";
import {
  getNotificationPreferences,
  createOrUpdateNotificationPreferences,
} from "../../lib/db/repositories/notification-repo";
import { getAllMilestones } from "../../lib/db/repositories/milestone-repo";
import { getAllRomMeasurements } from "../../lib/db/repositories/rom-repo";
import { getUnlockedAchievements } from "../../lib/db/repositories/achievement-repo";
import type { LocalProfile } from "../../lib/db/repositories/profile-repo";
import type { LocalNotificationPreferences } from "../../lib/db/repositories/notification-repo";
import type { GraftType } from "../../lib/types";
import { PrivacyPolicyModal } from "../../components/PrivacyPolicyModal";
import { AuthModal } from "../../components/AuthModal";
import { DeleteAccountModal } from "../../components/DeleteAccountModal";
import { pushAll, pullAll, deltaSync, deleteRemoteUserData } from "../../lib/db/sync/sync-engine";
import { purgeAllUserData } from "../../lib/db/purge-user-data";
import { DataConflictModal } from "../../components/DataConflictModal";
import { supabase } from "../../lib/supabase";
import { db as drizzleDb } from "../../lib/db/database-context";

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
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<LocalNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [editingReminder, setEditingReminder] = useState(false);
  const [editingGraftType, setEditingGraftType] = useState(false);
  const [savingGraftType, setSavingGraftType] = useState(false);
  const [editingSurgeryDate, setEditingSurgeryDate] = useState(false);
  const [surgeryDateValue, setSurgeryDateValue] = useState<Date>(new Date());
  const [savingSurgeryDate, setSavingSurgeryDate] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reminderHour, setReminderHour] = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  // Cloud Sync state
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [conflictUserId, setConflictUserId] = useState<string | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const prof = await getProfile();
      setProfile(prof);
      const prefs = await getNotificationPreferences();
      setNotifPrefs(prefs);
      if (prefs?.daily_reminder_time) {
        const [h, m] = prefs.daily_reminder_time.split(":").map(Number);
        setReminderHour(h);
        setReminderMinute(m);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setReminderDate(d);
        // Schedule push notification if we have a push token
        if (prof?.device_id) {
          registerForPushNotifications(prof.device_id).then(() =>
            scheduleDailyReminder(h, m)
          );
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function toggleEveningNudge(value: boolean) {
    if (!notifPrefs) return;
    setSavingNotif(true);
    const updated = await createOrUpdateNotificationPreferences({
      evening_nudge_enabled: value,
    });
    setNotifPrefs(updated);
    setSavingNotif(false);
  }

  async function saveReminderTime(h = reminderHour, m = reminderMinute) {
    if (!notifPrefs) return;
    setSavingNotif(true);
    const timeStr = `${pad(h)}:${pad(m)}`;
    const updated = await createOrUpdateNotificationPreferences({
      daily_reminder_time: timeStr,
    });
    setNotifPrefs(updated);
    void scheduleDailyReminder(h, m);
    setEditingReminder(false);
    setSavingNotif(false);
  }

  async function handleExportData() {
    const milestones = await getAllMilestones();
    const roms = await getAllRomMeasurements();
    const achievements = await getUnlockedAchievements();

    const exportData = {
      profile,
      milestones,
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
    if (!profile) return;
    setSavingGraftType(true);
    const updated = await updateProfile({ graft_type: graftType });
    setProfile(updated);
    setEditingGraftType(false);
    setSavingGraftType(false);
  }

  async function saveSurgeryDate(date: Date) {
    if (!profile) return;
    setSavingSurgeryDate(true);
    const dateStr = date.toISOString().split("T")[0];
    const updated = await updateProfile({ surgery_date: dateStr });
    setProfile(updated);
    setEditingSurgeryDate(false);
    setSavingSurgeryDate(false);
  }

  async function handleSignOut() {
    await signOut();
  }

  function handleDeleteAccount() {
    setDeleteModalVisible(true);
  }

  async function confirmResetApp() {
    setDeleting(true);
    try {
      await purgeAllUserData();
      try {
        await signOut();
      } catch (err) {
        console.error("[confirmResetApp] signOut error:", err);
      }
      router.replace("/(intro)");
    } catch (err) {
      console.error("[confirmResetApp] error:", err);
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    try {
      if (session?.user.id) {
        await deleteRemoteUserData(session.user.id);
      }
      try {
        await signOut();
      } catch (err) {
        console.error("[confirmDeleteAccount] signOut error:", err);
      }
      await purgeAllUserData();
      router.replace("/(intro)");
    } catch (err) {
      console.error("[confirmDeleteAccount] error:", err);
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  }

  async function handleAuthSuccess(userId: string) {
    setAuthModalVisible(false);

    const hasLocalData = await detectLocalData();
    const hasCloudData = await detectCloudData(userId);

    if (hasLocalData && hasCloudData) {
      // Both sides have data — let the user choose
      setConflictUserId(userId);
      setConflictModalVisible(true);
      return;
    }

    // No conflict: push local data up, or pull cloud data down
    if (hasLocalData) {
      const push = await pushAll(userId);
      if (push.error) {
        setSyncError(`Signed in but sync failed: ${push.error}`);
        return;
      }
    } else {
      const pull = await pullAll(userId);
      if (pull.error) {
        setSyncError(`Signed in but sync failed: ${pull.error}`);
        return;
      }
    }

    const now = new Date().toISOString();
    const updated = await updateProfile({ supabase_user_id: userId, last_synced_at: now });
    setProfile(updated);
  }

  async function handleUseCloudData() {
    if (!conflictUserId) return;
    setConflictLoading(true);
    try {
      // Purge local data first so the pull is a clean replace, not a merge
      await purgeAllUserData();
      const pull = await pullAll(conflictUserId);
      if (pull.error) {
        setSyncError(`Sync failed: ${pull.error}`);
        return;
      }
      const now = new Date().toISOString();
      const existingProfile = await getProfile();
      if (existingProfile) {
        const updated = await updateProfile({ supabase_user_id: conflictUserId, last_synced_at: now });
        setProfile(updated);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSyncError(`Sync failed: ${message}`);
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
        setSyncError(`Sync failed: ${push.error}`);
        return;
      }
      const now = new Date().toISOString();
      const updated = await updateProfile({ supabase_user_id: conflictUserId, last_synced_at: now });
      setProfile(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSyncError(`Sync failed: ${message}`);
    } finally {
      setConflictLoading(false);
      setConflictModalVisible(false);
      setConflictUserId(null);
    }
  }

  async function handleSyncNow() {
    if (!session?.user.id) return;
    setSyncing(true);
    setSyncError(null);

    const lastSyncedAt = profile?.last_synced_at ?? new Date(0).toISOString();
    const result = await deltaSync(session.user.id, lastSyncedAt);

    if (result.error) {
      setSyncError(result.error);
    } else {
      setProfile(await getProfile());
    }

    setSyncing(false);
  }

  function surgeryDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function daysSince(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
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
        {profile?.surgery_date && daysSince(profile.surgery_date) >= 0 && (
          <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }}>
            Day {daysSince(profile.surgery_date)} of recovery
          </Text>
        )}
        {profile?.surgery_date && daysSince(profile.surgery_date) < 0 && (
          <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }}>
            Surgery in {Math.abs(daysSince(profile.surgery_date))} days
          </Text>
        )}
        {!profile?.surgery_date && (
          <Text className="text-sm mt-1" style={{ color: "#6B6B6B" }}>
            Surgery date not set
          </Text>
        )}
      </View>

      {/* Surgery Info */}
      <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <Text
          className="text-base font-semibold mb-3"
          style={{ color: "#2D2D2D" }}
        >
          Surgery Details
        </Text>

        {/* Surgery Date — editable when null or in the future */}
        {isSurgeryDateEditable(profile?.surgery_date) ? (
          <>
            <TouchableOpacity
              className="flex-row justify-between items-center py-3 border-b border-border"
              onPress={() => {
                setSurgeryDateValue(
                  profile?.surgery_date
                    ? new Date(profile.surgery_date + "T12:00:00")
                    : new Date()
                );
                setEditingSurgeryDate((v) => !v);
              }}
            >
              <Text style={{ color: "#6B6B6B" }}>Surgery Date</Text>
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold" style={{ color: "#2D2D2D" }}>
                  {profile?.surgery_date
                    ? surgeryDateLabel(profile.surgery_date)
                    : "Not set"}
                </Text>
                <Ionicons
                  name={editingSurgeryDate ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#A0A0A0"
                />
              </View>
            </TouchableOpacity>
            {editingSurgeryDate && (
              <View className="pb-2 pt-2">
                {Platform.OS === "web" ? (
                  <>
                    <input
                      type="date"
                      value={surgeryDateValue.toISOString().split("T")[0]}
                      onChange={(e) => {
                        if (e.target.value)
                          setSurgeryDateValue(
                            new Date(e.target.value + "T12:00:00")
                          );
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: 16,
                        border: "1px solid #E5E7EB",
                        borderRadius: 12,
                        marginBottom: 8,
                        outline: "none",
                        boxSizing: "border-box",
                        backgroundColor: "transparent",
                      }}
                    />
                    <TouchableOpacity
                      className={`bg-primary rounded-xl py-3 items-center ${savingSurgeryDate ? "opacity-50" : ""}`}
                      onPress={() => saveSurgeryDate(surgeryDateValue)}
                      disabled={savingSurgeryDate}
                    >
                      {savingSurgeryDate ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white font-semibold">Save</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View className="items-center">
                      <DateTimePicker
                        value={surgeryDateValue}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_, selected) => {
                          if (!selected) return;
                          setSurgeryDateValue(selected);
                          if (Platform.OS === "android")
                            saveSurgeryDate(selected);
                        }}
                        style={{ width: "100%" }}
                      />
                    </View>
                    {Platform.OS !== "android" && (
                      <TouchableOpacity
                        className={`bg-primary rounded-xl py-3 items-center mt-2 ${savingSurgeryDate ? "opacity-50" : ""}`}
                        onPress={() => saveSurgeryDate(surgeryDateValue)}
                        disabled={savingSurgeryDate}
                      >
                        {savingSurgeryDate ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text className="text-white font-semibold">Save</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}
          </>
        ) : (
          <InfoRow
            label="Surgery Date"
            value={
              profile?.surgery_date
                ? surgeryDateLabel(profile.surgery_date)
                : "—"
            }
          />
        )}

        {/* Editable Graft Type */}
        <TouchableOpacity
          className="flex-row justify-between items-center py-3 border-b border-border"
          onPress={() => setEditingGraftType((v) => !v)}
        >
          <Text style={{ color: "#6B6B6B" }}>Graft Type</Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold" style={{ color: "#2D2D2D" }}>
              {profile?.graft_type
                ? (GRAFT_TYPE_OPTIONS.find(
                    (o) => o.value === profile.graft_type
                  )?.label ?? capitalize(profile.graft_type))
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
                  <Text
                    className="text-base"
                    style={{ color: isSelected ? "#fff" : "#2D2D2D" }}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                  {savingGraftType && isSelected && (
                    <ActivityIndicator size="small" color="#fff" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <InfoRow
          label="Knee"
          value={profile?.knee_side ? capitalize(profile.knee_side) : "—"}
        />

        {/* Manage Exercises */}
        <TouchableOpacity
          className="flex-row justify-between items-center py-3"
          onPress={() => router.push("/exercise-picker")}
        >
          <Text style={{ color: "#6B6B6B" }}>Exercise Plan</Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold" style={{ color: "#2D2D2D" }}>
              Manage
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#A0A0A0" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      {notifPrefs && (
        <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <Text
            className="text-base font-semibold mb-3"
            style={{ color: "#2D2D2D" }}
          >
            Notifications
          </Text>

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
                      saveReminderTime(
                        selected.getHours(),
                        selected.getMinutes()
                      );
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

      {/* Cloud Sync */}
      <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <Text className="text-base font-semibold mb-1" style={{ color: "#2D2D2D" }}>
          Cloud Sync
        </Text>

        {session === null ? (
          <>
            <Text className="text-sm mb-4" style={{ color: "#6B6B6B" }}>
              Sync your recovery data across devices with a free account.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl py-3 items-center"
              onPress={() => setAuthModalVisible(true)}
            >
              <Text className="text-white font-semibold">Sign In or Create Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View className="flex-row items-center mb-3">
              <Ionicons name="cloud-done-outline" size={16} color={Colors.secondary} />
              <Text className="ml-2 text-sm font-medium" style={{ color: Colors.secondary }}>
                {session.user.email}
              </Text>
            </View>
            {profile?.last_synced_at ? (
              <Text className="text-xs mb-3" style={{ color: "#A0A0A0" }}>
                Last synced:{" "}
                {new Date(profile.last_synced_at).toLocaleString()}
              </Text>
            ) : (
              <Text className="text-xs mb-3" style={{ color: "#A0A0A0" }}>
                Never synced
              </Text>
            )}
            {syncError && (
              <Text className="text-xs mb-3" style={{ color: Colors.error }}>
                {syncError}
              </Text>
            )}
            <TouchableOpacity
              className={`bg-primary rounded-xl py-3 items-center ${syncing ? "opacity-50" : ""}`}
              onPress={handleSyncNow}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Sync Now</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

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
        {session !== null && (
          <ActionRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
          />
        )}
        <ActionRow
          icon={session ? "trash-outline" : "refresh-outline"}
          label={session ? "Delete Account" : "Reset App"}
          onPress={handleDeleteAccount}
          destructive
          last
        />
      </View>

      <PrivacyPolicyModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
      />

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={handleAuthSuccess}
      />

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={session ? confirmDeleteAccount : confirmResetApp}
        deleting={deleting}
        mode={session ? "delete" : "reset"}
      />

      <DataConflictModal
        visible={conflictModalVisible}
        onUseCloud={handleUseCloudData}
        onKeepLocal={handleKeepLocalData}
        loading={conflictLoading}
        onDismiss={() => { if (!conflictLoading) { setConflictModalVisible(false); setConflictUserId(null); } }}
      />
    </ScrollView>
  );
}

const LOCAL_DATA_TABLES = [
  "user_exercises",
  "daily_logs",
  "exercise_logs",
  "rom_measurements",
  "milestones",
  "user_achievements",
  "user_gate_criteria",
  "notification_preferences",
] as const;

const CLOUD_DATA_TABLES = [
  "user_exercises",
  "daily_logs",
  "exercise_logs",
  "rom_measurements",
  "milestones",
] as const;

async function detectLocalData(): Promise<boolean> {
  const localProfile = await getProfile();
  if (localProfile?.surgery_date || localProfile?.graft_type) return true;
  for (const table of LOCAL_DATA_TABLES) {
    const row = drizzleDb.$client.getFirstSync<{ id: string }>(`SELECT id FROM ${table} LIMIT 1`);
    if (row) return true;
  }
  return false;
}

async function detectCloudData(userId: string): Promise<boolean> {
  // Check profiles table first
  const { data: cloudProfile, error: profileError } = await supabase
    .from("profiles" as never)
    .select("id")
    .eq("id", userId)
    .maybeSingle() as { data: { id: string } | null; error: unknown };

  if (profileError) {
    console.error("[detectCloudData] Error checking cloud profile:", profileError);
    return true; // conservative: assume data exists on error
  }
  if (cloudProfile) return true;

  // Check key user data tables
  for (const table of CLOUD_DATA_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(table as any) as any)
      .select("id")
      .eq("user_id", userId)
      .limit(1) as { data: { id: string }[] | null; error: unknown };

    if (error) {
      console.error(`[detectCloudData] Error checking cloud table ${table}:`, error);
      return true; // conservative: assume data exists on error
    }
    if (data && data.length > 0) return true;
  }
  return false;
}

function isSurgeryDateEditable(dateStr: string | null | undefined): boolean {
  if (!dateStr) return true;
  return new Date(dateStr).getTime() > Date.now();
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-3 border-b border-border">
      <Text style={{ color: "#6B6B6B" }}>{label}</Text>
      <Text className="font-semibold" style={{ color: "#2D2D2D" }}>
        {value}
      </Text>
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
      <Ionicons name={icon as never} size={20} color={color} />
      <Text className="ml-3 text-base" style={{ color }}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="#A0A0A0"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  );
}
