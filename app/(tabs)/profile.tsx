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
import { useDataStore } from "../../lib/data/data-store-context";
import type { Profile, NotificationPreferences } from "../../lib/data/data-store.types";
import type { GraftType } from "../../lib/types";
import { PrivacyPolicyModal } from "../../components/PrivacyPolicyModal";
import { AuthModal } from "../../components/AuthModal";
import { DeleteAccountModal } from "../../components/DeleteAccountModal";
import { purgeAllUserData } from "../../lib/db/purge-user-data";

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
  const store = useDataStore();
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
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
  const [authModalVisible, setAuthModalVisible] = useState(false);

  useEffect(() => {
    async function loadData() {
      const prof = await store.getProfile();
      setProfile(prof);
      const prefs = await store.getNotificationPreferences();
      setNotifPrefs(prefs);
      if (prefs?.daily_reminder_time) {
        const [h, m] = prefs.daily_reminder_time.split(":").map(Number);
        setReminderHour(h);
        setReminderMinute(m);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setReminderDate(d);
        // Schedule push notification if we have a push token
        registerForPushNotifications(null).then(() =>
          scheduleDailyReminder(h, m)
        );
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function toggleEveningNudge(value: boolean) {
    if (!notifPrefs) return;
    setSavingNotif(true);
    const updated = await store.createOrUpdateNotificationPreferences({
      evening_nudge_enabled: value,
    });
    setNotifPrefs(updated);
    setSavingNotif(false);
  }

  async function saveReminderTime(h = reminderHour, m = reminderMinute) {
    if (!notifPrefs) return;
    setSavingNotif(true);
    const timeStr = `${pad(h)}:${pad(m)}`;
    const updated = await store.createOrUpdateNotificationPreferences({
      daily_reminder_time: timeStr,
    });
    setNotifPrefs(updated);
    void scheduleDailyReminder(h, m);
    setEditingReminder(false);
    setSavingNotif(false);
  }

  async function handleExportData() {
    const milestones = await store.getAllMilestones();
    const roms = await store.getAllRomMeasurements();
    const achievements = await store.getAchievements();

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
    const updated = await store.updateProfile({ graft_type: graftType });
    setProfile(updated);
    setEditingGraftType(false);
    setSavingGraftType(false);
  }

  async function saveSurgeryDate(date: Date) {
    if (!profile) return;
    setSavingSurgeryDate(true);
    const dateStr = date.toISOString().split("T")[0];
    const updated = await store.updateProfile({ surgery_date: dateStr });
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

      {/* Account */}
      <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <Text className="text-base font-semibold mb-1" style={{ color: "#2D2D2D" }}>
          Account
        </Text>
        {session === null ? (
          <>
            <Text className="text-sm mb-4" style={{ color: "#6B6B6B" }}>
              Sign in to back up your recovery data and access it across devices.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl py-3 items-center"
              onPress={() => setAuthModalVisible(true)}
            >
              <Text className="text-white font-semibold">Sign In or Create Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="flex-row items-center">
            <Ionicons name="person-circle-outline" size={16} color={Colors.secondary} />
            <Text className="ml-2 text-sm font-medium" style={{ color: Colors.secondary }}>
              {session.user.email}
            </Text>
          </View>
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
        onSuccess={(_userId: string) => setAuthModalVisible(false)}
      />

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={confirmResetApp}
        deleting={deleting}
        mode={session ? "delete" : "reset"}
      />
    </ScrollView>
  );
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
