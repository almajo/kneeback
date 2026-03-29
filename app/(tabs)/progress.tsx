import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { RomDualChart } from "../../components/RomDualChart";
import { LogRomSheet } from "../../components/LogRomSheet";
import { ProgressCalendar } from "../../components/ProgressCalendar";
import { useMilestones } from "../../lib/hooks/use-milestones";
import { PhaseGateCard } from "../../components/PhaseGateCard";
import { PhaseGateDetail } from "../../components/PhaseGateDetail";
import { usePhaseGate } from "../../lib/hooks/use-phase-gate";
import { useDataStore } from "../../lib/data/data-store-context";
import type { RomMeasurement } from "../../lib/data/data-store.types";
import { ShareWinPrompt } from "../../components/community/ShareWinPrompt";
import { submitCommunityPost } from "../../lib/community";
import { getCommunityIdentity } from "../../lib/community-identity";
import { generateId } from "../../lib/utils/uuid";

export default function ProgressScreen() {
  const store = useDataStore();
  const [loading, setLoading] = useState(true);
  const [romSheetOpen, setRomSheetOpen] = useState(false);
  const { milestones, addMilestone, deleteMilestone } = useMilestones();
  const [romData, setRomData] = useState<
    { date: string; flexion: number | null; extension: number | null }[]
  >([]);
  const [measurements, setMeasurements] = useState<RomMeasurement[]>([]);
  const [surgeryDate, setSurgeryDate] = useState<string | null>(null);
  const [gateDetailKey, setGateDetailKey] = useState<string | null>(null);
  const [pendingShareWin, setPendingShareWin] = useState<string | null>(null);
  const [surgeryStatus, setSurgeryStatus] = useState<
    "no_date" | "pre_surgery" | "post_surgery"
  >("no_date");

  const daysSinceSurgery = surgeryDate
    ? Math.floor((Date.now() - new Date(surgeryDate).getTime()) / 86_400_000)
    : 0;

  const latestFlexion =
    romData.length > 0 ? romData[romData.length - 1].flexion : null;
  const { gateProgress, confirmedCriteria, toggleCriterion } = usePhaseGate(
    daysSinceSurgery,
    surgeryStatus,
    latestFlexion
  );

  const loadMeasurements = useCallback(async () => {
    const romRows = await store.getAllRomMeasurements();
    setMeasurements(romRows.slice().reverse());
    setRomData(
      romRows.map((r) => ({
        date: r.date,
        flexion: r.flexion_degrees,
        extension: r.extension_degrees,
      }))
    );
  }, [store]);

  useEffect(() => {
    async function loadData() {
      const profile = await store.getProfile();
      if (profile?.surgery_date) {
        setSurgeryDate(profile.surgery_date);
        const diff = Math.floor(
          (Date.now() - new Date(profile.surgery_date).getTime()) / 86_400_000
        );
        setSurgeryStatus(diff >= 0 ? "post_surgery" : "pre_surgery");
      }
      await loadMeasurements();
      setLoading(false);
    }
    loadData();
  }, [loadMeasurements]);

  async function handleSaveRom(payload: {
    date: string;
    flexion_degrees: number | null;
    extension_degrees: number | null;
    quad_activation: boolean;
  }): Promise<void> {
    try {
      await store.createRomMeasurement({
        id: generateId(),
        ...payload,
      });
      await loadMeasurements();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save measurement");
    }
  }

  async function handleSaveMilestone(payload: {
    title: string;
    category: "milestone" | "win";
    date: string;
    notes?: string;
    template_key?: string;
  }) {
    addMilestone(payload);
    if (payload.category === "win") {
      setPendingShareWin(payload.title);
    }
  }

  async function handleShareWin(message: string) {
    if (!pendingShareWin) return;
    const profile = await store.getProfile();
    const identity = await getCommunityIdentity(profile);
    const { error } = await submitCommunityPost(identity, {
      post_type: "win",
      title: pendingShareWin,
      body: message || pendingShareWin,
    });
    setPendingShareWin(null);
    if (error) {
      Alert.alert("Couldn't share", error);
    }
  }

  function openAddSheet() {
    setRomSheetOpen(true);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <PhaseGateDetail
        visible={gateDetailKey !== null}
        gateKey={gateDetailKey}
        gateProgress={gateProgress}
        confirmedCriteria={confirmedCriteria}
        daysSinceSurgery={daysSinceSurgery}
        latestFlexion={latestFlexion}
        onToggleCriterion={toggleCriterion}
        onClose={() => setGateDetailKey(null)}
      />
      <ShareWinPrompt
        visible={!!pendingShareWin}
        winTitle={pendingShareWin ?? ""}
        onShare={handleShareWin}
        onSkip={() => setPendingShareWin(null)}
      />
      <LogRomSheet
        visible={romSheetOpen}
        onClose={() => setRomSheetOpen(false)}
        onSave={handleSaveRom}
        editingEntry={null}
        lastMeasurement={measurements[0] as any ?? null}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      >
        <PhaseGateCard
          gateProgress={gateProgress}
          daysSinceSurgery={daysSinceSurgery}
          surgeryStatus={surgeryStatus}
          onViewDetail={(key) => setGateDetailKey(key)}
        />

        {/* ROM section */}
        <View className="flex-row items-center justify-between mx-4 mb-3">
          <Text
            className="text-base font-semibold"
            style={{ color: Colors.text }}
          >
            Log ROM
          </Text>
          <TouchableOpacity
            onPress={openAddSheet}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-full border border-primary"
            style={{ backgroundColor: Colors.primary + "15" }}
          >
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text
              className="text-sm font-semibold"
              style={{ color: Colors.primary }}
            >
              Log
            </Text>
          </TouchableOpacity>
        </View>

        {romData.length === 0 ? (
          <View className="mx-4 bg-surface border border-border rounded-2xl p-6 items-center mb-4">
            <Text className="text-3xl mb-2">📐</Text>
            <Text
              className="text-base font-semibold mb-1 text-center"
              style={{ color: Colors.text }}
            >
              No measurements yet
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: Colors.textSecondary }}
            >
              Tap + Log to record your first measurement.
            </Text>
          </View>
        ) : (
          <RomDualChart data={romData} daysSinceSurgery={daysSinceSurgery} />
        )}

        <View className="mx-4 my-2 border-b border-border" />
        <ProgressCalendar
          store={store}
          milestones={milestones as any}
          measurements={measurements as any}
          onSaveMilestone={handleSaveMilestone}
          onDeleteMilestone={deleteMilestone}
          surgeryDate={surgeryDate}
        />
      </ScrollView>
    </>
  );
}
