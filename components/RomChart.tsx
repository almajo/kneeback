import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Colors } from "../constants/colors";

interface RomData {
  date: string;
  flexion: number | null;
  extension: number | null;
}

interface Props {
  data: RomData[];
}

const screenWidth = Dimensions.get("window").width - 32;

export function RomChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <View className="mx-4 bg-surface border border-border rounded-2xl p-6 items-center">
        <Text className="text-base text-center" style={{ color: "#6B6B6B" }}>
          Log at least 2 ROM measurements to see your chart.
        </Text>
      </View>
    );
  }

  const labels = data.slice(-7).map((d) => d.date.slice(5)); // MM-DD
  const flexionData = data.slice(-7).map((d) => d.flexion ?? 0);
  const extensionData = data.slice(-7).map((d) => d.extension ?? 0);

  return (
    <View className="mx-4 mb-4">
      <Text className="text-base font-semibold mb-3" style={{ color: "#2D2D2D" }}>
        Flexion (degrees)
      </Text>
      <LineChart
        data={{
          labels,
          datasets: [{ data: flexionData, color: () => Colors.primary, strokeWidth: 2 }],
        }}
        width={screenWidth}
        height={160}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalPlaces: 0,
          color: () => Colors.primary,
          labelColor: () => "#A0A0A0",
          propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.primary },
        }}
        bezier
        style={{ borderRadius: 16 }}
      />

      <Text className="text-base font-semibold mb-3 mt-4" style={{ color: "#2D2D2D" }}>
        Extension (degrees)
      </Text>
      <LineChart
        data={{
          labels,
          datasets: [{ data: extensionData, color: () => Colors.secondary, strokeWidth: 2 }],
        }}
        width={screenWidth}
        height={160}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalPlaces: 0,
          color: () => Colors.secondary,
          labelColor: () => "#A0A0A0",
          propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.secondary },
        }}
        bezier
        style={{ borderRadius: 16 }}
      />
    </View>
  );
}
