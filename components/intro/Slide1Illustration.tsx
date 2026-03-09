import React from "react";
import Svg, { Rect, Circle, Ellipse, Path, G } from "react-native-svg";

interface Props { size?: number }
export default function Slide1Illustration({ size = 280 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 280 280">
      {/* Floor */}
      <Rect x="20" y="200" width="240" height="12" rx="6" fill="#E8E0D8" />

      {/* Couch body */}
      <Rect x="40" y="145" width="200" height="60" rx="12" fill="#FF6B35" />
      {/* Couch back */}
      <Rect x="40" y="110" width="200" height="48" rx="10" fill="#E85D25" />
      {/* Couch left arm */}
      <Rect x="30" y="130" width="28" height="75" rx="8" fill="#E85D25" />
      {/* Couch right arm */}
      <Rect x="222" y="130" width="28" height="75" rx="8" fill="#E85D25" />
      {/* Couch cushion line */}
      <Rect x="138" y="145" width="4" height="60" rx="2" fill="#E85D25" />

      {/* Person - body (lying) */}
      <Rect x="70" y="130" width="130" height="32" rx="16" fill="#FFDCC8" />
      {/* Person - head */}
      <Circle cx="190" cy="130" r="22" fill="#FFDCC8" />
      {/* Hair */}
      <Path d="M170 118 Q190 108 210 118" stroke="#5C3317" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <Circle cx="183" cy="127" r="2.5" fill="#333" />
      <Circle cx="197" cy="127" r="2.5" fill="#333" />
      {/* Sad mouth */}
      <Path d="M184 135 Q190 131 196 135" stroke="#A0522D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Leg (raised slightly) */}
      <Rect x="60" y="128" width="55" height="22" rx="11" fill="#FFDCC8" />
      {/* Knee */}
      <Ellipse cx="90" cy="135" rx="14" ry="14" fill="#FFDCC8" />

      {/* Ice pack */}
      <Rect x="72" y="122" width="36" height="26" rx="8" fill="#2EC4B6" opacity="0.85" />
      {/* Ice pack pattern */}
      <Path d="M80 128 L86 140 M88 125 L88 143 M94 128 L88 140" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

      {/* Pillow under head */}
      <Ellipse cx="195" cy="148" rx="28" ry="10" fill="#FFF0E5" />

      {/* Small stars/sparkles to show pain */}
      <G opacity="0.7">
        <Path d="M230 100 L232 92 L234 100 L242 102 L234 104 L232 112 L230 104 L222 102 Z" fill="#FF6B35" />
        <Path d="M50 95 L51.5 90 L53 95 L58 96.5 L53 98 L51.5 103 L50 98 L45 96.5 Z" fill="#FF6B35" />
      </G>
    </Svg>
  );
}
