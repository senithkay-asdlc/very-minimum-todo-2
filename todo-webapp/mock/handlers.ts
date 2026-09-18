import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/todo-api";
import { scopesFromToken } from "./authz/session";

type Todo = components["schemas"]["Todo"];

// The caller this mock speaks for. Reset on every full page load — see the
// note below — so a reload always shows the same seed, which is what makes a
// verification run repeatable.
const mockCaller = { userId: "mock-owner" };

// Oldest first, per the contract's own listMyTodos summary. One done, one
// pending, so the wireframe's badge distinction ("Pending"/"Done") is visible
// without any clicks, and enough rows that the list reads as a running list.
let nextId = 3;
let todos: (Todo & { owner: string })[] = [
  {
    id: "1",
    text: "Buy groceries",
    done: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    owner: mockCaller.userId,
  },
  {
    id: "2",
    text: "Call the dentist",
    done: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    owner: mockCaller.userId,
  },
];

function stripOwner(todo: Todo & { owner: string }): Todo {
  const { owner: _owner, ...rest } = todo;
  return rest;
}

export const handlers = [
  // The caller's todos, oldest first — the contract's own summary. No
  // `todos:read` check here: a caller who does not hold it was refused by
  // mock/authz/gateway.ts and never reached this handler.
  http.get("/api/me/todos", ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const mine = todos
      .filter((t) => t.owner === mockCaller.userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const page = mine.slice(offset, offset + limit);
    return HttpResponse.json({
      count: mine.length,
      next: offset + limit < mine.length ? `/me/todos?limit=${limit}&offset=${offset + limit}` : null,
      previous: offset > 0 ? `/me/todos?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
      data: page.map(stripOwner),
    });
  }),

  http.post("/api/me/todos", async ({ request }) => {
    const auth = request.headers.get("authorization");
    void scopesFromToken(auth); // ownership widening only; the gateway already checked reach.
    const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return HttpResponse.json(
        { code: 400, message: "text is required", description: "text must be a non-empty string" },
        { status: 400 },
      );
    }
    const created: Todo & { owner: string } = {
      id: String(nextId++),
      text,
      done: false,
      createdAt: new Date().toISOString(),
      owner: mockCaller.userId,
    };
    todos = [...todos, created];
    return HttpResponse.json(stripOwner(created), { status: 201 });
  }),

  http.post("/api/me/todos/:todoId/complete", ({ params }) => {
    const todoId = String(params.todoId);
    const todo = todos.find((t) => t.id === todoId && t.owner === mockCaller.userId);
    if (!todo) {
      return HttpResponse.json(
        { code: 404, message: "not found", description: `no such todo item: ${todoId}` },
        { status: 404 },
      );
    }
    todo.done = true;
    return HttpResponse.json(stripOwner(todo));
  }),
];
