// The keys the platform actually emits for this component — src/env.ts's set,
// exactly. No sibling API address here: todo-api is same-origin `/api`.
export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  // The OIDC scopes are `group` and `ou`, singular, plus the project's own
  // catalog handles, exactly as the platform requests them.
  USER_AUTH_SCOPES: "openid profile email group ou todos:read todos:create todos:complete",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};
