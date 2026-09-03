---
name: worktree
description: Create isolated git worktree and execute instructions independently
agent-type: claude
---

# Worktree Skill

When invoked, create a new isolated git worktree based on the user's requirements.

## Flow

1. **Parse requirement**: Extract the user's task/requirement from `args` (if provided) or from the immediate context
2. **Generate worktree name**: Create a name from the requirement using kebab-case (e.g., "fix-collision-detection", "add-pause-feature")
3. **Create worktree**: Call `EnterWorktree` with the generated name to create and enter isolated worktree
4. **Execute in isolation**: All subsequent work happens in this worktree independently from main branch
5. **Report status**: Confirm worktree created and ready for work

## Naming Convention

- Use kebab-case (lowercase, hyphens)
- Keep it short and descriptive
- Examples: `feat-ghost-piece`, `fix-line-clear-bug`, `refactor-rotation`

## Behavior

- User invokes: `/worktree [optional requirement description]`
- Claude generates name and creates worktree
- All work from that point is isolated in `.trees/[name]/`
- User can continue with instructions for that worktree
- To exit: user invokes `ExitWorktree` command

## Key Points

- Worktree is independent from main branch—no conflicts
- Changes can be reviewed/merged separately
- Perfect for parallel work or experimental features
