# KneeBack

> Your daily companion for ACL rehabilitation. Equal parts useful, honest, and darkly funny.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![NativeWind](https://img.shields.io/badge/NativeWind-Tailwind_CSS-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## What is KneeBack?

ACL recovery is a 9–12 month slog. Motivation is high on day one and tends to vanish somewhere around week six when you're doing your fourteenth set of quad sets in a row on a foam roller.

KneeBack is a mobile app built to be the daily execution engine for ACL rehab — the thing that gets you to actually do the exercises your physio prescribed, track whether your knee is cooperating, and occasionally laugh at the absurdity of the whole situation.

It is **not** a replacement for your physiotherapist. It is the Duolingo-style habit machine that helps you follow their protocol.

---

## Features

### Today's Workout
- Day counter since surgery (because you absolutely know the exact number)
- Editable daily exercise checklist from a pre-built rehab library
- Built-in rest timer and rep counter
- Smart Rest mode — log a swelling day, freeze your streak, get a supportive message about being medically obligated to lie on the couch

### Progress Tracking
- Flexion and extension angle tracking (the real milestones)
- Quad activation logging (binary: fired / did not fire)
- Charts and milestone timelines to see the actual curve of recovery

### Personality Layer
- Humorous achievement system: *"First Shower Without Panic"*, *"Straight Leg Jedi"*
- Daily feedback with actual personality: *Steps today: 42. Technically walking. Emotionally crawling.*
- Crutch survival tips for the early days

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile framework | [Expo](https://expo.dev) + [React Native](https://reactnative.dev) |
| Language | TypeScript |
| Styling | [NativeWind](https://www.nativewind.dev) (Tailwind for RN) |
| Navigation | Expo Router (file-based) |
| Backend / Auth | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| Animations | React Native Reanimated |
| Charts | React Native Chart Kit + SVG |
| Push Notifications | Expo Notifications |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android emulator, or [Expo Go](https://expo.dev/go)

### Installation

```bash
git clone https://github.com/alexpulver/kneeback.git
cd kneeback
npm install
```

### Environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Run

```bash
# Start the dev server
npx expo start

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android
```

---

## Project Structure

```
app/               # Expo Router file-based routes
components/        # Reusable UI components
hooks/             # Custom React hooks
lib/               # Supabase client, utilities
constants/         # Theme, exercise library, config
assets/            # Images, fonts
docs/              # Planning documents and design specs
```

---

## Roadmap

**Phase 1 — MVP (current)**
- [x] User auth (email + Google)
- [x] Pre-built exercise library with sets/reps/hold customisation
- [x] Daily checklist with built-in timer
- [x] Progress charts (flexion/extension)
- [x] Smart Rest mode
- [x] Milestone timeline and achievements

**Phase 2 — Refinement**
- [ ] Custom exercise creation
- [ ] Export data to show your physio
- [ ] Advanced visualisations

**Phase 3 — Community**
- [ ] Opt-in peer matching by graft type and recovery phase
- [ ] Qualitative win-sharing (no leaderboards)

---

## Contributing

Issues and PRs welcome. If you've had ACL surgery and have strong opinions about what a good rehab app should do, open an issue — lived experience is the best product spec.

---

## License

MIT
