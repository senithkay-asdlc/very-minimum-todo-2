import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/todo-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// Same-origin: nginx in this pod reverse-proxies /api to the sibling todo-api,
// through the API gateway when it exposes one. The OpenAPI paths themselves
// (`/me/todos`, …) stay exactly as todo-api's contract declares them.
export const todoApi = createClient<paths>({ baseUrl: "/api" });

// The ONE authorization rule for every call this client makes: attach the
// bearer, and let src/authz/client.ts decide what a 401/403 means. Nothing
// about authorization is decided here.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

todoApi.use(authMiddleware);
