import { useEffect, useState, type ReactElement } from "react";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

/**
 * The OIDC redirect target, `<origin>/callback`. Processes the code exchange
 * once on mount and lands the user back at the app root — there is no session
 * to read here yet, which is why this route sits outside every provider.
 */
export function CallbackPage(): ReactElement {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await handleCallback();
        if (!cancelled) window.location.assign(window.location.origin);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6">Todo</Typography>
        <Typography color="text.secondary">
          {error ? `Sign-in failed: ${error}` : "Signing you in…"}
        </Typography>
      </Stack>
    </Box>
  );
}
