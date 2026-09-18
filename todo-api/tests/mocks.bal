// Test doubles for the database layer, so `bal test` never dials a real
// postgres instance. `createPgClient`/`ensureSchema` run at module init —
// before any test function body executes — so they are replaced statically
// via a function-target `@test:Mock`, not a runtime `test:when()` stub.
import ballerina/test;
import ballerinax/postgresql;

@test:Mock {
    functionName: "createPgClient"
}
function mockCreatePgClient() returns postgresql:Client|error {
    return test:mock(postgresql:Client);
}

@test:Mock {
    functionName: "ensureSchema"
}
function mockEnsureSchema() returns error? {
    return;
}

// The gateway-assertion tests hit GET /me/todos with a valid caller and need
// a real HTTP response, not a call into the (unconfigured) mocked db client.
@test:Mock {
    functionName: "storeListTodos"
}
function mockStoreListTodos(string userId, int 'limit, int offset) returns TodoPage|error {
    return {count: 0, data: []};
}
