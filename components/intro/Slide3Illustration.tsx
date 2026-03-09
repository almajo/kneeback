import React from "react";
import Svg, { Rect, Circle, Path, G, Ellipse } from "react-native-svg";

interface Props { size?: number }
export default function Slide3Illustration({ size = 280 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 280 280">
      {/* Floor */}
      <Rect x="20" y="230" width="240" height="12" rx="6" fill="#E8E0D8" />

      {/* Doctor coat */}
      <Rect x="82" y="155" width="76" height="80" rx="12" fill="white" />
      {/* Coat lapels */}
      <Path d="M120 155 L100 180 L120 175 Z" fill="#E8E0D8" />
      <Path d="M120 155 L140 180 L120 175 Z" fill="#E8E0D8" />
      {/* Stethoscope */}
      <Path d="M105 175 Q100 195 115 200 Q130 205 130 190" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Circle cx="130" cy="188" r="5" fill="#333" />
      {/* ID badge */}
      <Rect x="112" y="182" width="16" height="20" rx="3" fill="#2EC4B6" />
      <Rect x="115" y="186" width="10" height="2" rx="1" fill="white" />
      <Rect x="115" y="190" width="10" height="2" rx="1" fill="white" />
      {/* Red cross on coat */}
      <Rect x="148" y="168" width="6" height="16" rx="2" fill="#FF6B35" />
      <Rect x="143" y="173" width="16" height="6" rx="2" fill="#FF6B35" />

      {/* Doctor head */}
      <Circle cx="120" cy="128" r="28" fill="#FFDCC8" />
      {/* Hair */}
      <Path d="M94 120 Q120 98 146 120 L146 110 Q120 88 94 110 Z" fill="#5C3317" />
      {/* Eyes - friendly */}
      <Path d="M108 125 Q112 121 116 125" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M124 125 Q128 121 132 125" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Warm smile */}
      <Path d="M108 135 Q120 145 132 135" stroke="#A0522D" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Arms - one waving */}
      <Path d="M82 170 L55 145" stroke="#FFDCC8" strokeWidth="14" strokeLinecap="round" />
      <Circle cx="50" cy="142" r="10" fill="#FFDCC8" />
      {/* Waving fingers */}
      <Path d="M44 136 L42 128" stroke="#FFDCC8" strokeWidth="4" strokeLinecap="round" />
      <Path d="M50 134 L50 126" stroke="#FFDCC8" strokeWidth="4" strokeLinecap="round" />
      <Path d="M56 136 L58 128" stroke="#FFDCC8" strokeWidth="4" strokeLinecap="round" />
      {/* Other arm */}
      <Path d="M158 170 L175 190" stroke="#FFDCC8" strokeWidth="14" strokeLinecap="round" />

      {/* Speech bubble */}
      <Rect x="155" y="70" width="105" height="70" rx="14" fill="#FFF0E5" />
      <Path d="M170 140 L155 158 L180 140 Z" fill="#FFF0E5" />
      {/* Lines in speech bubble */}
      <Rect x="168" y="84" width="79" height="8" rx="4" fill="#E8D0C0" />
      <Rect x="168" y="98" width="60" height="8" rx="4" fill="#E8D0C0" />
      <Rect x="168" y="112" width="72" height="8" rx="4" fill="#E8D0C0" />

      {/* Legs */}
      <Rect x="90" y="228" width="20" height="10" rx="6" fill="#FFDCC8" />
      <Rect x="130" y="228" width="20" height="10" rx="6" fill="#FFDCC8" />
    </Svg>
  );
}
