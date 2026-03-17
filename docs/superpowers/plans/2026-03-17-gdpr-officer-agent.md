# Klaus — GDPR & Security Officer Agent Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Klaus custom agent file so he can be dispatched as a subagent in architecture and data design discussions.

**Architecture:** Single markdown file in `.claude/agents/` — Claude Code workspace agent format. No code, no tests, no dependencies. Content is fully specified in the design spec.

**Tech Stack:** Claude Code custom agents (markdown frontmatter + instruction body)

---

### Task 1: Create the agent file

**Files:**
- Create: `.claude/agents/gdpr-officer.md`

- [ ] **Step 1: Ensure the `.claude/agents/` directory exists**

```bash
mkdir -p ".claude/agents"
```

- [ ] **Step 2: Create `.claude/agents/gdpr-officer.md`** with the content from the spec appendix (`docs/superpowers/specs/2026-03-17-gdpr-officer-agent-design.md`, section "Agent File").

- [ ] **Step 3: Verify the file is valid**

Open a new Claude Code session and type:
```
Use the gdpr-officer agent to briefly introduce yourself.
```
Expected: Klaus responds in persona, mentioning his role and citing GDPR.

- [ ] **Step 4: Commit**

```bash
git add ".claude/agents/gdpr-officer.md" "docs/superpowers/specs/2026-03-17-gdpr-officer-agent-design.md" "docs/superpowers/plans/2026-03-17-gdpr-officer-agent.md"
git commit -m "feat: add Klaus GDPR & Security Officer agent"
```
