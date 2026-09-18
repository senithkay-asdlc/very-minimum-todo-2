// Adapted from thunder-authentication's screens.example.ts pattern for THIS
// app's one screen (specs/design/components/todo-webapp/wireframes.dsl).
//
// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. TodoList is gated on the
// operation it loads — GET /me/todos, the caller's own todos, oldest first —
// never on a handle typed elsewhere.

import { canCall } from "./core";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  readonly public?: boolean;
}

/** In rail order — there is exactly one screen. */
export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "todolist", label: "My Todos", path: "/todos", loads: "GET /me/todos" },
];

// FAIL LOUDLY at module load — see thunder-authentication SKILL.md §5.
for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some((screen) => !screen.public && screen.loads !== null);
}
