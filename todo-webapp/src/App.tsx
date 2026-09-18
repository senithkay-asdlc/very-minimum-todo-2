// Adapted from thunder-authentication's App.example.tsx pattern. The ROUTING
// STRUCTURE is prescribed there (NoAccess above the shell, Forbidden inside
// it, /callback outside every provider, /forbidden wired once from the
// router root) — only PAGE_BY_KEY and APP_NAME are this app's own.

import { useEffect, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { APP_NAME } from "./appName";
import { AppShell } from "./shell/AppShell";
import { CallbackPage } from "./pages/Callback";
import { TodoListPage } from "./pages/TodoList";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";

/** YOUR pages, keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  todolist: <TodoListPage />,
};

/** The screens reachable before sign-in — none for this app: every screen
 *  sits behind the Thunder SSO gate. */
const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export function App(): ReactElement {
  return (
    <>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={
              <AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>
            }
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </>
  );
}

/**
 * Hands src/authz/client.ts the route a refusal goes to. ONCE, from inside the
 * router and above every route, so it is wired before the first request can be
 * answered.
 */
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6">{APP_NAME}</Typography>
        <Typography color="text.secondary">Checking your session…</Typography>
      </Stack>
    </Box>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard. Only a MISSING session starts a sign-in: currentUser()
  // has already tried a silent renew, and signing in on a merely expired token
  // re-logs the user in on every visit.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  // NoAccess REPLACES the shell — no rail to wrap it.
  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        {/* Forbidden is INSIDE the shell: the rail the caller can use stays. */}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
