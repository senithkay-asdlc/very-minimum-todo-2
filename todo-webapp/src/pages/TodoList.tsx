import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { todoApi } from "../api";
import type { components } from "../generated/todo-api";

type Todo = components["schemas"]["Todo"];

/**
 * The wireframe's one screen (wireframes.dsl: TodoList) — an input + "Add"
 * button, and the running list of the caller's own todos, pending and done
 * together, oldest first, with a checkbox to mark one done and a badge
 * distinguishing pending vs. done. No edit, no delete.
 */
export function TodoListPage(): ReactElement {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await todoApi.GET("/me/todos", { params: { query: {} } });
    if (error) {
      setLoadError("Could not load your todos. Try reloading the page.");
      return;
    }
    // The contract already orders oldest first; sort defensively for a mock
    // or a future page that does not guarantee it.
    setTodos([...data.data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setAdding(true);
    setAddError(null);
    const { data, error } = await todoApi.POST("/me/todos", { body: { text: trimmed } });
    setAdding(false);
    if (error) {
      setAddError("Could not add that todo. Try again.");
      return;
    }
    setText("");
    setTodos((prev) => [...(prev ?? []), data]);
  }

  async function handleComplete(todo: Todo): Promise<void> {
    if (todo.done) return;
    setCompletingId(todo.id);
    const { data, error } = await todoApi.POST("/me/todos/{todoId}/complete", {
      params: { path: { todoId: todo.id } },
    });
    setCompletingId(null);
    if (error) return; // the card just stays pending; a retry click tries again
    setTodos((prev) => (prev ?? []).map((t) => (t.id === todo.id ? data : t)));
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My Todos</PageTitle.Header>
      </PageTitle>

      <Box component="form" onSubmit={(e) => void handleAdd(e)} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <TextField
            label="What needs doing?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            fullWidth
            size="small"
          />
          <Button type="submit" variant="contained" disabled={adding || text.trim().length === 0}>
            Add
          </Button>
        </Stack>
        {addError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {addError}
          </Alert>
        ) : null}
      </Box>

      {loadError ? <Alert severity="error">{loadError}</Alert> : null}

      {todos === null && !loadError ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : null}

      {todos !== null && todos.length === 0 ? (
        <Typography color="text.secondary">No todos yet — add your first one above.</Typography>
      ) : null}

      {todos !== null && todos.length > 0 ? (
        <Stack spacing={2}>
          {todos.map((todo) => (
            <Card key={todo.id} variant="outlined">
              <CardHeader title="Todo" sx={{ pb: 0 }} />
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={todo.done}
                        disabled={todo.done || completingId === todo.id}
                        onChange={() => void handleComplete(todo)}
                      />
                    }
                    label={todo.text}
                  />
                  <Chip
                    label={todo.done ? "Done" : "Pending"}
                    color={todo.done ? "success" : "warning"}
                    size="small"
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : null}
    </PageContent>
  );
}
