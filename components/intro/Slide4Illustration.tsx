import React from "react";
import Svg, { Rect, Circle, Path, G, Ellipse, Line } from "react-native-svg";

export default function Slide4Illustration() {
  return (
    <Svg width="280" height="280" viewBox="0 0 280 280">
      {/* Track / road */}
      <Ellipse cx="140" cy="220" rx="120" ry="24" fill="#E8E0D8" />
      <Ellipse cx="140" cy="220" rx="96" ry="16" fill="#F5F0EB" />

      {/* Starting line */}
      <Rect x="100" y="190" width="6" height="52" rx="3" fill="#333" />
      {/* Starting line stripes */}
      <Rect x="100" y="190" width="6" height="7" rx="1" fill="white" />
      <Rect x="100" y="204" width="6" height="7" rx="1" fill="white" />
      <Rect x="100" y="218" width="6" height="7" rx="1" fill="white" />
      <Rect x="100" y="232" width="6" height="7" rx="1" fill="white" />

      {/* Start flag */}
      <Rect x="100" y="162" width="2" height="30" rx="1" fill="#333" />
      <Path d="M102 162 L128 170 L102 180 Z" fill="#FF6B35" />

      {/* Figure - leaning forward in starting position */}
      {/* Body */}
      <Rect x="120" y="175" width="30" height="38" rx="10" fill="#FF6B35" transform="rotate(-10 135 195)" />
      {/* Head */}
      <Circle cx="138" cy="158" r="18" fill="#FFDCC8" />
      {/* Hair */}
      <Path d="M122 152 Q138 138 154 152 L154 148 Q138 132 122 148 Z" fill="#5C3317" />
      {/* Eyes - determined */}
      <Path d="M130 156 L136 155" stroke="#333" strokeWidth="2" strokeLinecap="round" />
      <Path d="M140 155 L146 156" stroke="#333" strokeWidth="2" strokeLinecap="round" />
      {/* Focused expression */}
      <Path d="M132 163 Q138 167 144 163" stroke="#A0522D" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Forward arm */}
      <Path d="M150 185 L172 168" stroke="#FFDCC8" strokeWidth="12" strokeLinecap="round" />
      <Circle cx="174" cy="166" r="8" fill="#FFDCC8" />
      {/* Back arm */}
      <Path d="M118 183 L95 195" stroke="#FFDCC8" strokeWidth="12" strokeLinecap="round" />

      {/* Front leg */}
      <Path d="M138 210 L155 232" stroke="#FFDCC8" strokeWidth="14" strokeLinecap="round" />
      {/* Back leg (bent) */}
      <Path d="M125 208 L118 228 L105 225" stroke="#FFDCC8" strokeWidth="12" strokeLinecap="round" />

      {/* Motion lines */}
      <G opacity="0.5">
        <Line x1="82" y1="175" x2="68" y2="175" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" />
        <Line x1="80" y1="185" x2="62" y2="185" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" />
        <Line x1="84" y1="165" x2="72" y2="165" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" />
      </G>

      {/* Small star/sparkle above figure */}
      <Path d="M200 100 L203 90 L206 100 L216 103 L206 106 L203 116 L200 106 L190 103 Z" fill="#FF6B35" opacity="0.8" />
      <Path d="M230 130 L232 124 L234 130 L240 132 L234 134 L232 140 L230 134 L224 132 Z" fill="#2EC4B6" opacity="0.7" />

      {/* Horizon line (road ahead) */}
      <Line x1="110" y1="215" x2="260" y2="215" stroke="#D0C8C0" strokeWidth="1.5" strokeDasharray="8,6" />
    </Svg>
  );
}
