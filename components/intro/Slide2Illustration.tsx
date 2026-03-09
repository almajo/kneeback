import React from "react";
import Svg, { Rect, Circle, Path, G, Ellipse, Text } from "react-native-svg";

interface Props { size?: number }
export default function Slide2Illustration({ size = 280 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 280 280">
      {/* Floor */}
      <Rect x="20" y="230" width="240" height="12" rx="6" fill="#E8E0D8" />

      {/* Phone */}
      <Rect x="155" y="100" width="70" height="118" rx="10" fill="#333" />
      <Rect x="159" y="108" width="62" height="100" rx="6" fill="#FFF0E5" />
      {/* Phone home indicator */}
      <Rect x="178" y="212" width="24" height="3" rx="1.5" fill="#666" />
      {/* Chart on phone */}
      <G>
        <Rect x="163" y="112" width="54" height="36" rx="4" fill="#E8F8F7" />
        {/* Chart bars */}
        <Rect x="168" y="130" width="8" height="14" rx="2" fill="#2EC4B6" />
        <Rect x="180" y="124" width="8" height="20" rx="2" fill="#2EC4B6" />
        <Rect x="192" y="118" width="8" height="26" rx="2" fill="#FF6B35" />
        <Rect x="204" y="121" width="8" height="23" rx="2" fill="#2EC4B6" />
      </G>
      {/* "ROM" label on phone */}
      <Rect x="163" y="153" width="54" height="14" rx="4" fill="#FFF0E5" />
      <Rect x="163" y="171" width="54" height="14" rx="4" fill="#FFF0E5" />
      <Rect x="163" y="189" width="38" height="14" rx="4" fill="#FFF0E5" />

      {/* Person body */}
      <Rect x="80" y="148" width="52" height="82" rx="10" fill="#FF6B35" />
      {/* Person head */}
      <Circle cx="106" cy="125" r="26" fill="#FFDCC8" />
      {/* Hair */}
      <Path d="M82 118 Q106 100 130 118" fill="#5C3317" />
      {/* Eyes - happy */}
      <Path d="M96 122 Q99 119 102 122" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M110 122 Q113 119 116 122" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Big smile */}
      <Path d="M95 132 Q106 142 117 132" stroke="#A0522D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Left arm raised */}
      <Path d="M80 160 L52 120" stroke="#FFDCC8" strokeWidth="16" strokeLinecap="round" />
      {/* Fist */}
      <Circle cx="52" cy="118" r="11" fill="#FFDCC8" />
      {/* Right arm holding phone */}
      <Path d="M132 160 L152 140" stroke="#FFDCC8" strokeWidth="14" strokeLinecap="round" />
      {/* Legs */}
      <Rect x="80" y="220" width="22" height="18" rx="8" fill="#FFDCC8" />
      <Rect x="110" y="220" width="22" height="18" rx="8" fill="#FFDCC8" />

      {/* Confetti */}
      <G>
        <Rect x="50" y="60" width="8" height="8" rx="2" fill="#FF6B35" transform="rotate(20 50 60)" />
        <Rect x="80" y="45" width="6" height="6" rx="1" fill="#2EC4B6" transform="rotate(-15 80 45)" />
        <Rect x="130" y="50" width="7" height="7" rx="2" fill="#FF6B35" transform="rotate(30 130 50)" />
        <Circle cx="165" cy="65" r="4" fill="#FFDCC8" />
        <Rect x="195" y="55" width="6" height="6" rx="1" fill="#2EC4B6" transform="rotate(45 195 55)" />
        <Rect x="230" y="75" width="7" height="7" rx="2" fill="#FF6B35" transform="rotate(-10 230 75)" />
        <Circle cx="45" cy="90" r="3" fill="#2EC4B6" />
        <Rect x="220" y="95" width="5" height="5" rx="1" fill="#FFDCC8" transform="rotate(25 220 95)" />
        <Circle cx="165" cy="80" r="3" fill="#FF6B35" />
        <Rect x="100" y="65" width="5" height="5" rx="1" fill="#2EC4B6" transform="rotate(-30 100 65)" />
      </G>
    </Svg>
  );
}
