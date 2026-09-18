# very-minimum-todo-2 — PRD

## Problem Statement

People jot down tasks in scattered places — sticky notes, chat threads, memory — and lose track of what still needs doing. They need one simple, reliable place to capture a task and mark it done once finished, that they can return to from any device because it is saved for them, not just on one machine.

## Solution

A minimal web todo app: a user signs up and signs in, adds todo items, and marks them done. There is no editing and no deleting — the feature set is deliberately as small as it can be. Every todo is private to the user who created it and is saved to a database so it persists across sessions and devices.

## Actors

- **User** — a signed-in individual who adds their own todo items and marks their own items done. There is no separate admin role; every user has the same capabilities over their own data only.

## User Stories

1. As a User, I want to sign up for an account and sign in, so that I have a private, persistent place for my todos.
2. As a User, I want to add a new todo item, so that I can capture something I need to do.
3. As a User, I want to see my list of todo items, so that I can review what is outstanding and what I've finished.
4. As a User, I want to mark a todo item as done, so that I can track my progress.

## Product Decisions

- **Sign-in**: every user signs in via SSO through Thunder, the platform IDP (organization default).
- **Self-service sign-up**: anyone can create their own account and sign in immediately — no admin provisioning step.
- **Data scope**: todos are private per user — a user only ever sees and marks done the todos they themselves created; there is no shared or admin-visible list.
- **Persistence**: todo items are saved in a database so they survive across sessions and devices, not just kept in the browser.
- **No lifecycle beyond add/done**: a todo item has exactly two states — not done and done. There is no edit and no delete, matching the deliberately minimal scope.
- **List display**: a user's todo list shows both pending and completed items together, with completed ones visibly distinguished. *assumed*
- **List ordering**: todo items are listed oldest-first, in the order they were added. *assumed*
- **Sign-up flow**: sign-up completes directly with no email verification step. *assumed*

## Out of Scope

- Editing an existing todo's text.
- Deleting a todo (either pending or done).
- Due dates, priorities, categories, or tags on todos.
- Sharing a todo list between users, or any admin/manager view of another user's todos.
- Notifications or reminders.
- Any bulk actions (mark all done, clear completed, etc.).

## Open Questions

*(none — all facts needed to write this PRD were either supplied or are organization defaults)*