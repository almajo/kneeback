# KneeBack – Product Concept (The Master Plan)

### Core Idea
KneeBack is a daily companion app for ACL rehabilitation. It combines the simplicity and habit-building mechanics of apps like Duolingo with a playful, highly relatable personality. It does not replace medical professionals, but rather acts as the user's daily execution and motivation engine. 

**The Guiding Philosophy:** Reward showing up, validate the emotional toll of recovery, and embrace the awkward, frustrating realities of rehab with humor.

### Target Users
**Primary:** ACL reconstruction patients.
* **Why:** Long timeline (9-12 months), highly structured protocols, high initial motivation that wanes during the "messy middle" of recovery.

---

## Pillar 1: Utility & Frictionless Logging (The MVP Core)
The app must make doing and logging daily exercises easier than writing them on a piece of paper. 

**The Pre-Built Exercise Library**
Instead of forcing users to type out every exercise, KneeBack provides a database of standard, universal early-rehab exercises.
* Users can pick from a list (e.g., Quad Sets, Heel Slides, Straight Leg Raises, Prone Hangs, Ankle Pumps).
* Users customize the sets, reps, and hold times. 
* **Frictionless Editing:** The daily plan is highly fluid. Users can easily edit today's routine (e.g., bumping up from 2 sets to 3) as their physiotherapist updates their protocol.

**The Daily Experience**
Opening the app instantly shows:
* *Day X since surgery*
* Today's editable checklist of exercises.
* Built-in tools: A rest timer and repetition counter to keep the user focused.

---

## Pillar 2: Progress Tracking & The Realities of Rehab
Rehab isn't a straight line. The app must track the metrics that actually matter in early recovery and protect the user from overtraining.

**Crucial Early Metrics**
The app tracks and visualizes progress relative to the user's own baseline:
* **Extension (Getting it straight):** The holy grail of the first 4 weeks. 
* **Flexion (Bending):** Tracked in degrees.
* **Quad Activation:** Simple binary tracking (Did the quad fire today? Yes/No).

**The "Smart Rest" Mechanic (Safety First)**
Pushing through acute swelling to keep a gamified streak is dangerous. 
* Users can log a "High Pain / Swelling Day."
* If selected, the app *rewards* the user for logging in and listening to their body.
* The daily exercise requirement is waived, the "streak" is safely frozen, and the user gets a supportive message about the importance of rest.

---

## Pillar 3: The Humor & Personality Layer
Health apps are usually sterile. KneeBack is self-aware, sarcastic, and deeply empathetic to the absurdities of rehab. The tone is always supportive, never mocking.

**Features:**
* **Achievement Unlocked:** "First Shower Without Panic," "Shoelace Tied Independently," "Straight Leg Jedi."
* **Daily Step Feedback:** *Steps today: 42. Technically walking. Emotionally crawling.*
* **Smart Rest Feedback:** *Swelling day logged. The couch is officially your medical duty station. Good job listening to your knee.*
* **Crutch Hacks:** Daily practical tips for surviving the early days (e.g., "Use a backpack; your hands belong to the crutches now.")

---

## Phased Development Strategy

To get this app into the hands of patients as fast as possible, development is strictly phased.

### Phase 1: The MVP (Current Focus)
* **Goal:** Build a functional, funny daily tracker that can be used immediately post-surgery.
* **Features:** Basic user auth, the pre-built exercise library, daily checklist + timer, basic progress charts (Flexion/Extension), the "Smart Rest" toggle, and a hardcoded list of humorous achievements/daily messages.
* **No Community:** Solo experience only to ensure fast shipping.

### Phase 2: Refinement & Advanced Tracking (Post-Launch)
* **Features:** Better data visualization, ability to add completely custom exercises to the personal library, exporting data to show the physio.

### Phase 3: The Anti-Comparison Community (Long-Term)
* **Features:** Opt-in peer matching by graft type and recovery phase. Qualitative updates (sharing wins) rather than numerical leaderboards. 

---

## Technology Stack (Valid & Free-Tier Friendly)
* **Frontend:** Expo + React Native (Language: TypeScript, Styling: NativeWind).
* **Backend:** Supabase (PostgreSQL, Supabase Auth). *Easily handles the exercise library and user logs on the free tier.*
* **Notifications:** Expo Push Notifications.
* **Web/Admin:** Vercel.