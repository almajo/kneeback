# General Instructions

- Prefer skills and CLI over MCP usage if it's available
- Use the appropriate skills when they fit the problem
- Keep interviewing the user until the plan and idea is crystal clear
- prefer working on branches over worktrees when simple use case

## Workflow habits

- Create a commit for each finished feature with a descriptive message
- After adding a new feature, make sure to test it using playwright
- Code must adhere to liniting and formatting best practices
- Save screenshots under `/artifacts`. Especially those made with playwright
- Use the playwright-cli skill to access and test the server

### Bug/Feature Development

1. Create new branch on a git worktree, following common naming conventions
2. Iterate on the implementation work, use the AskUserTool when input needed
3. run /simplify to make code simpler in some cases
4. Review implementation 
5. Make commit work
6. Create Pull Request into main with work summary and actions taken
7. Wait for input, read the PR Review from Github Copilot in comments and go implement fixes
8. Push final update and run tests if available. Output the PR link for the user to manually merge.

## Cleanup

- **ONLY remove files/directories created in the current session**
- Never delete pre-existing directories like `/artifacts/` that may contain user's work
- When cleaning up playwright tests: only remove `.playwright-cli/` (session snapshots I created)
- Always ask before removing anything if uncertain about what's yours vs what's pre-existing

## Console

- I use zsh so always put paths in "" when using the console, e.g. for git commands