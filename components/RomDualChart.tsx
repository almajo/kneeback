import { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Colors } from "../constants/colors";

interface RomData {
  date: string;
  flexion: number | null;
  extension: number | null;
}

interface Props {
  data: RomData[];
  daysSinceSurgery: number;
}

const screenWidth = Dimensions.get("window").width - 32;

export function RomDualChart({ data, daysSinceSurgery }: Props) {
  const defaultFlexion = true;
  const defaultExtension = daysSinceSurgery <= 21;

  const [showFlexion, setShowFlexion] = useState(defaultFlexion);
  const [showExtension, setShowExtension] = useState(defaultExtension);

  if (data.length < 2) {
    return (
      <View className="mx-4 bg-surface border border-border rounded-2xl p-6 items-center">
        <Text className="text-sm text-center" style={{ color: Colors.textSecondary }}>
          Log at least 2 measurements to see your chart.
        </Text>
      </View>
    );
  }

  const recent = data.slice(-7);
  const labels = recent.map((d) => d.date.slice(5)); // MM-DD

  const flexionValues = recent.map((d) => d.flexion ?? 0);
  const extensionValues = recent.map((d) => d.extension ?? 0);

  // Compute y-axis range from visible datasets

  const datasets: { data: number[]; color: () => string; strokeWidth: number }[] = [];
  if (showFlexion) {
    datasets.push({ data: flexionValues, color: () => Colors.primary, strokeWidth: 2 });
  }
  if (showExtension) {
    datasets.push({ data: extensionValues, color: () => Colors.secondary, strokeWidth: 2 });
  }

  // Fallback: chart-kit requires at least one dataset with data
  const chartDatasets =
    datasets.length > 0
      ? datasets
      : [{ data: flexionValues.map(() => 0), color: () => "transparent", strokeWidth: 0 }];

  return (
    <View className="mx-4 mb-4">
      {/* Section header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold" style={{ color: Colors.text }}>
          Range of Motion
        </Text>
        {/* Toggle pills */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowFlexion((v) => !v)}
            className="flex-row items-center gap-1 px-3 py-1 rounded-full border"
            style={{
              backgroundColor: showFlexion ? Colors.primary + "20" : "transparent",
              borderColor: showFlexion ? Colors.primary : Colors.border,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: showFlexion ? Colors.primary : Colors.textMuted,
              }}
            />
            <Text
              className="text-xs font-semibold"
              style={{ color: showFlexion ? Colors.primary : Colors.textMuted }}
            >
              Flexion
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowExtension((v) => !v)}
            className="flex-row items-center gap-1 px-3 py-1 rounded-full border"
            style={{
              backgroundColor: showExtension ? Colors.secondary + "20" : "transparent",
              borderColor: showExtension ? Colors.secondary : Colors.border,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: showExtension ? Colors.secondary : Colors.textMuted,
              }}
            />
            <Text
              className="text-xs font-semibold"
              style={{ color: showExtension ? Colors.secondary : Colors.textMuted }}
            >
              Extension
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <LineChart
        data={{
          labels,
          datasets: chartDatasets,
        }}
        width={screenWidth}
        height={180}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalPlaces: 0,
          color: () => Colors.primary,
          labelColor: () => Colors.textMuted,
          propsForDots: { r: "4", strokeWidth: "2" },
        }}
        fromZero={false}
        yAxisSuffix="°"
        bezier
        style={{ borderRadius: 16 }}
        withHorizontalLines
        withVerticalLines={false}
      />

      {!showFlexion && !showExtension && (
        <View
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="text-sm" style={{ color: Colors.textMuted }}>
            Tap a toggle to show data
          </Text>
        </View>
      )}
    </View>
  );
}
