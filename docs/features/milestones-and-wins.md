# Milestones & Wins Timeline

## Why we built this

ACL recovery is 9–12 months of grinding through exercises with very little visible progress from week to week. The hardest part isn't the pain — it's the psychological middle: the weeks where you're not dramatically broken anymore, but also nowhere near recovered. Motivation collapses here.

We noticed that users have two distinct emotional needs we weren't serving:

1. **Something to look forward to.** Clinical events like "stitches out" or "first physio appointment" are real milestones that patients think about constantly. Counting down to them gives shape to an otherwise formless recovery timeline.

2. **A place to celebrate small wins.** Putting socks on yourself for the first time is genuinely a big deal after ACL surgery. There was nowhere in the app to capture that. These moments would just pass — felt, then forgotten.

The existing Progress tab only showed ROM charts and the calendar heatmap — useful for tracking, but cold and clinical. We needed warmth and forward momentum alongside the data.

## What we built

A vertical timeline on the Progress tab with two entry types:

- **Milestone** (`◆`) — future-dated clinical or scheduled events. Users can pick from preset templates (stitches removed, off crutches, driving again, etc.) or write their own. Countdowns show automatically ("in 3 days").
- **Win** (`★`) — personal highlights logged in the moment, auto-dated to today. No date picker needed; it just happened.

The timeline splits around a `— TODAY —` divider: upcoming milestones above, past entries below. Today's wins pulse green. By default only 3+3 entries show; "Show more" expands the full list.

If a milestone falls on today's date, a highlighted card surfaces on the Today tab above the exercise list — a small celebration moment that makes opening the app feel rewarding.

## Key decisions

**Two categories, not one.** We originally considered a single "event" type, but the UX needs are different: milestones need a date picker and presets, wins need speed (one tap, type it, done). Conflating them would have made both worse.

**Preset templates.** Typing "Stitches removed" on a phone while your knee is propped up is annoying. The six presets cover the most common early-recovery events. Users can still write anything custom.

**No streak risk.** Wins are purely additive — they don't affect streak logic or daily completion. This was deliberate. The last thing a recovering patient needs is a feature that creates pressure.

**Long-press to delete, not swipe.** Accidental deletions on a timeline feel bad. Long-press + confirmation alert is a small extra step that prevents frustration.
