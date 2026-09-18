// Persistence for the caller's todo items. Every query is scoped to the
// caller's own userId — the assertion's `sub` — never a bare id lookup.
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

const string DEFAULT_DB_HOST = "localhost";
const int DEFAULT_DB_PORT = 5432;
const string DEFAULT_DB_USER = "postgres";
const string DEFAULT_DB_PASSWORD = "postgres";
const string DEFAULT_DB_NAME = "postgres";

isolated function resolvedDbPort() returns int|error {
    if todoDbPort.trim() == "" {
        return DEFAULT_DB_PORT;
    }
    return check int:fromString(todoDbPort.trim());
}

// Wrapped so a test can replace it with `@test:Mock` instead of dialling a
// real database.
isolated function createPgClient() returns postgresql:Client|error {
    int dbPort = check resolvedDbPort();
    string dbHost = todoDbHost.trim() == "" ? DEFAULT_DB_HOST : todoDbHost;
    string dbUser = todoDbUser.trim() == "" ? DEFAULT_DB_USER : todoDbUser;
    string dbPassword = todoDbPassword.trim() == "" ? DEFAULT_DB_PASSWORD : todoDbPassword;
    string dbName = todoDbName.trim() == "" ? DEFAULT_DB_NAME : todoDbName;
    return new (host = dbHost, username = dbUser, password = dbPassword, database = dbName, port = dbPort);
}

final postgresql:Client dbClient = check createPgClient();

// Startup work: make sure the table this service owns exists. Wrapped the
// same way as `createPgClient` so a test can skip it.
function ensureSchema() returns error? {
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            todo_text TEXT NOT NULL,
            done BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`);
    _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS todos_user_created_idx ON todos (user_id, created_at, id)`);
}

final () schemaReady = check ensureSchema();

type TodoRow record {|
    string id;
    string user_id;
    string todo_text;
    boolean done;
    time:Utc created_at;
|};

isolated function toTodo(TodoRow row) returns Todo => {
    id: row.id,
    text: row.todo_text,
    done: row.done,
    createdAt: time:utcToString(row.created_at)
};

// The caller's own todo items, oldest first — GET /me/todos.
function storeListTodos(string userId, int 'limit, int offset) returns TodoPage|error {
    sql:ParameterizedQuery countQuery = `SELECT count(*) FROM todos WHERE user_id = ${userId}`;
    int total = check dbClient->queryRow(countQuery);

    sql:ParameterizedQuery dataQuery = `SELECT id, user_id, todo_text, done, created_at FROM todos
        WHERE user_id = ${userId} ORDER BY created_at ASC, id ASC LIMIT ${'limit} OFFSET ${offset}`;
    stream<TodoRow, sql:Error?> rows = dbClient->query(dataQuery);
    Todo[] todos = [];
    check from TodoRow row in rows
        do {
            todos.push(toTodo(row));
        };
    check rows.close();

    string? next = offset + 'limit < total
        ? string `/me/todos?limit=${'limit}&offset=${offset + 'limit}`
        : ();
    int previousOffset = offset - 'limit;
    string? previous = offset > 0
        ? string `/me/todos?limit=${'limit}&offset=${previousOffset < 0 ? 0 : previousOffset}`
        : ();

    return {count: total, next, previous, data: todos};
}

// Add a new todo item for the caller — POST /me/todos.
function storeCreateTodo(string userId, string text) returns Todo|error {
    string id = uuid:createType4AsString();
    time:Utc createdAt = time:utcNow();
    sql:ParameterizedQuery insertQuery = `INSERT INTO todos (id, user_id, todo_text, done, created_at)
        VALUES (${id}, ${userId}, ${text}, false, ${createdAt})`;
    _ = check dbClient->execute(insertQuery);
    return {id, text, done: false, createdAt: time:utcToString(createdAt)};
}

// Mark one of the caller's own todo items done — POST /me/todos/{todoId}/complete.
// Returns () when the id does not exist or belongs to someone else — a 404,
// never a 403.
function storeCompleteTodo(string userId, string todoId) returns Todo?|error {
    sql:ParameterizedQuery updateQuery = `UPDATE todos SET done = true
        WHERE id = ${todoId} AND user_id = ${userId}`;
    sql:ExecutionResult result = check dbClient->execute(updateQuery);
    int? affected = result.affectedRowCount;
    if affected is () || affected == 0 {
        return ();
    }
    sql:ParameterizedQuery selectQuery = `SELECT id, user_id, todo_text, done, created_at FROM todos
        WHERE id = ${todoId} AND user_id = ${userId}`;
    TodoRow row = check dbClient->queryRow(selectQuery);
    return toTodo(row);
}
