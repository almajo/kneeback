# Figma → Code Integration Guide

Rules and patterns for translating Figma designs into production code for this codebase.

---

## Stack at a Glance

| Layer | Technology |
|---|---|
| Framework | React Native + Expo 54 |
| Routing | Expo Router v6 (file-based) |
| Styling | NativeWind v4 + Tailwind CSS v3 |
| Animations | react-native-reanimated v4 |
| Gestures | react-native-gesture-handler v2 |
| Icons | `@expo/vector-icons` → Ionicons |
| SVG | react-native-svg |
| Language | TypeScript (strict) |

---

## 1. Design Tokens

### Color Palette

All colors live in **`constants/colors.ts`** as a typed `Colors` object. **Always import from there — never hardcode hex values**.

```typescript
import { Colors } from "../constants/colors";

// Primary — warm orange
Colors.primary       // #FF6B35
Colors.primaryLight  // #FF8F5E
Colors.primaryDark   // #E55A2B

// Secondary — teal accent
Colors.secondary      // #2EC4B6
Colors.secondaryLight // #5EDDD1
Colors.secondaryDark  // #1FA99C

// Neutrals
Colors.background    // #FFF8F0  (app bg)
Colors.surface       // #FFFFFF  (card bg)
Colors.surfaceAlt    // #FFF0E5  (alternate surface)
Colors.text          // #2D2D2D
Colors.textSecondary // #6B6B6B
Colors.textMuted     // #A0A0A0

// Semantic
Colors.success  // #4CAF50
Colors.warning  // #FFB74D
Colors.error    // #EF5350
Colors.rest     // #7E57C2  (rest day purple)

// Borders
Colors.border      // #E8E0D8
Colors.borderLight // #F0EAE2
```

### Opacity Variants

Append a 2-digit hex alpha to any color token string — no helper needed:

```typescript
backgroundColor: Colors.success + "15"  // 8% opacity
borderColor: Colors.primary + "60"       // 38% opacity
```

Common alpha values: `"15"` ≈ 8%, `"40"` ≈ 25%, `"60"` ≈ 38%, `"80"` ≈ 50%.

### Tailwind Color Aliases

These match the `Colors` object and are available as Tailwind utilities in `tailwind.config.js`:

```js
primary         // bg-primary, text-primary, border-primary
primary-light   // bg-primary-light
primary-dark    // bg-primary-dark
secondary       // bg-secondary, text-secondary
background      // bg-background
surface         // bg-surface
surface-alt     // bg-surface-alt
rest            // bg-rest, text-rest
border          // border-border
border-light    // border-border-light
```

### Border Radius Tokens

```js
rounded-xl   // 16px
rounded-2xl  // 24px  ← most common card radius
rounded-full // pill/circle
```

### Adding New Tokens

When a Figma design introduces a new color or radius not in the existing palette:

1. Add it to `constants/colors.ts`
2. Mirror it in `tailwind.config.js` under `theme.extend.colors`
3. Use the Tailwind utility for static values; use the `Colors` import for dynamic/computed values

---

## 2. Styling Approach

### Two-Layer Pattern

All components use a **dual-layer styling strategy**:

| Layer | When to use | Syntax |
|---|---|---|
| Tailwind (`className`) | Static, non-dynamic styles | `className="flex-row items-center px-4 py-4"` |
| Inline `style` | Dynamic / computed values | `style={{ backgroundColor: Colors.primary }}` |

**Never mix concerns**: use `className` for layout and spacing; use `style` only when the value cannot be a static Tailwind class (e.g., token-based colors, runtime calculations).

```tsx
// CORRECT
<View
  className="mx-4 mb-3 rounded-2xl border"
  style={{
    backgroundColor: isCompleted ? Colors.success + "15" : Colors.surface,
    borderColor: isCompleted ? Colors.success + "60" : Colors.border,
  }}
>

// WRONG — don't put dynamic colors in className
<View className={`mx-4 mb-3 rounded-2xl border ${isCompleted ? "bg-success" : "bg-white"}`}>
```

### Common Layout Utilities

```
flex flex-row flex-col items-center justify-center justify-between flex-1 flex-wrap gap-*
```

### Common Spacing Scale

Tailwind default scale applies. Most-used values in this app:

```
px-4 py-4   (card inner padding)
mx-4        (screen edge margin)
mb-3        (card bottom gap)
gap-2 gap-3 (inline gaps)
```

### Text Scale Convention

Use `react-native` `Text` with className for typography. No custom text variants exist yet — match Figma font size to the nearest Tailwind class:

```
text-xs (12) / text-sm (14) / text-base (16) / text-lg (18) / text-xl (20) / text-2xl (24)
font-medium / font-semibold / font-bold
```

### Responsive Design

This is a **mobile-first React Native app** — no breakpoints needed. Use:
- `flex`/`flexbox` for fluid layouts
- `%`-based widths when needed via inline style
- `Dimensions.get("window")` for screen-size-dependent values

---

## 3. Component Patterns

### File Location

| Type | Path |
|---|---|
| Feature components | `components/<ComponentName>.tsx` |
| Illustration SVGs | `components/intro/<SlideNIllustration>.tsx` |
| Shared UI primitives | `components/ui/` (currently minimal) |
| Screen files | `app/(group)/<screen>.tsx` |

### Anatomy of a Component

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import type { SomeType } from "../lib/types";

interface Props {
  value: SomeType;
  onUpdate: (updated: Partial<SomeType>) => void; // callback, not mutation
  disabled?: boolean;
}

export function MyComponent({ value, onUpdate, disabled }: Props) {
  return (
    <View
      className="mx-4 mb-3 rounded-2xl border"
      style={{ backgroundColor: Colors.surface, borderColor: Colors.border }}
    >
      {/* content */}
    </View>
  );
}
```

Key rules:
- **Named exports**, not default exports
- **Typed Props interface** at top of file, above the component
- **Immutable updates** — callbacks receive `Partial<T>`, never mutate in place
- **`disabled` prop** renders `opacity-40` and disables touch handlers

### Conditional Rendering

```tsx
// Status-driven styling
<View style={{ backgroundColor: isCompleted ? Colors.success + "15" : Colors.surface }}>

// Conditional display
{expanded && <ExpandedContent />}

// Ternary for single-value toggle
className={`rounded-2xl ${disabled ? "opacity-40" : ""}`}
```

### Immutability Rule

**Never mutate state.** Always return a new object:

```tsx
// CORRECT
onUpdate({ actual_sets: nextSet, ...(isLastSet ? { completed: true } : {}) });

// WRONG
log.actual_sets = nextSet; // mutation — never do this
```

---

## 4. Icon System

### Library

**Ionicons** via `@expo/vector-icons`. No custom icon system exists.

```tsx
import { Ionicons } from "@expo/vector-icons";

<Ionicons name="checkmark-circle" size={28} color={Colors.success} />
```

### Existing Icon Names in Use

| Icon | Usage |
|---|---|
| `checkmark-circle` | Completed state |
| `ellipse-outline` | Incomplete / empty state |
| `chevron-up` / `chevron-down` | Expand/collapse |
| `trophy` | Achievements |

### Rules for New Icons

1. Always source from [Ionicons](https://ionic.io/ionicons) — don't add other icon libraries
2. `size` in px (common: 16, 20, 24, 28, 32)
3. `color` always from `Colors` token, never a literal hex

---

## 5. SVG Illustrations

For custom illustration assets from Figma:

```tsx
// components/intro/Slide2Illustration.tsx
import Svg, { Circle, Path, Rect } from "react-native-svg";

export function Slide2Illustration() {
  return (
    <Svg width={280} height={220} viewBox="0 0 280 220">
      <Circle cx={140} cy={110} r={80} fill={Colors.primary} />
      {/* ... paths from Figma SVG export ... */}
    </Svg>
  );
}
```

Workflow for Figma illustration → component:
1. Export frame as SVG from Figma
2. Create `components/<feature>/<Name>.tsx`
3. Replace hardcoded hex values with `Colors.*` tokens
4. Wrap in named export functional component
5. Accept `width`/`height` props for flexibility

---

## 6. Animation

Use `react-native-reanimated` for all animations (not `Animated` from react-native).

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

// Trigger
scale.value = withSpring(1.1);
```

Gestures use `react-native-gesture-handler` primitives, not the built-in `PanResponder`.

---

## 7. Asset Management

### Static Images

```
assets/images/
├── icon.png              # App icon (1024×1024)
├── splash-icon.png       # Splash screen
├── favicon.png           # Web
└── android-icon-*.png    # Android adaptive icons
```

Import pattern:

```typescript
const logo = require("../assets/images/icon.png");
<Image source={logo} />
```

### Design Assets from Figma

- **Raster images** (photos, complex backgrounds): export as PNG 2×/3× → save in `assets/images/`
- **Illustrations**: convert to SVG React component (see §5)
- **Icons**: use existing Ionicons — avoid importing SVG icons individually

---

## 8. Project Structure

```
app/
  (auth)/          # Sign in / sign up screens
  (intro)/         # Onboarding carousel (index.tsx)
  (onboarding)/    # Surgery setup wizard
  (tabs)/          # Main tab screens: today, progress, measurements, profile
  _layout.tsx      # Root layout — wraps AuthProvider
  index.tsx        # Root redirect logic

components/        # Reusable UI components (feature-level)
components/intro/  # SVG illustrations for intro slides
components/ui/     # Primitive UI abstractions (minimal, extend as needed)

constants/
  colors.ts        # ← Design token source of truth
  milestone-templates.ts

lib/
  types.ts         # All TypeScript interfaces and domain types
  supabase.ts      # Supabase client
  auth-context.tsx # Auth state (AuthProvider, useAuth)
  onboarding-context.tsx
  achievements.ts
  notifications.ts
  hooks/           # Custom hooks

assets/images/     # Static raster assets
docs/              # Documentation (plans, feature specs)
```

---

## 9. Figma → Code Workflow

### Step 1: Map Figma values to tokens

Before writing any code, map every value in the Figma frame to a token:

| Figma value | Code equivalent |
|---|---|
| `#FF6B35` fill | `Colors.primary` |
| `#FFF8F0` background | `Colors.background` |
| `16px` corner radius | `rounded-xl` |
| `24px` corner radius | `rounded-2xl` |
| `16px` padding | `p-4` |
| `12px` padding | `p-3` |

Any color in Figma not in the palette → add it to `constants/colors.ts` first.

### Step 2: Choose layout primitives

- Container → `<View>`
- Text → `<Text>`
- Button → `<TouchableOpacity>` (use `<Pressable>` only if you need press state)
- Scroll → `<ScrollView>` or `<FlatList>` (FlatList for lists)
- Input → `<TextInput>`

### Step 3: Apply the two-layer style rule

- Static layout/spacing → `className`
- Token-based colors and dynamic values → `style={{}}`

### Step 4: Wire interactivity

- Callbacks always flow **down** via props (`onPress`, `onUpdate`)
- State lives as high as needed but no higher
- Immutable updates only

### Step 5: Icons

Match Figma icons to Ionicons. If there's no match, look for the closest semantic equivalent in the Ionicons set before adding any other library.

### Step 6: Test in Expo Go / web

```bash
npx expo start        # Metro dev server
# Press 'w' for web, scan QR for iOS/Android
```

Run Playwright E2E for any interactive flows:

```bash
npx playwright test
```

---

## 10. What NOT to Do

| Don't | Do instead |
|---|---|
| Hardcode `"#FF6B35"` | Use `Colors.primary` |
| Use `Animated` from react-native | Use `react-native-reanimated` |
| Import SVG icon files individually | Use `Ionicons` from `@expo/vector-icons` |
| Add a new icon library | Find the closest Ionicons match |
| Mutate props or state in place | Return new objects in callbacks |
| Use `default export` for components | Use named exports |
| Use `<div>` / `<span>` | Use `<View>` / `<Text>` |
| Mix dynamic colors into `className` | Use `style={{}}` for dynamic colors |
| Nest JSX deeper than 4 levels | Extract a sub-component |
| Create files over 800 lines | Split by feature/concern |
