// Platform-injected configuration, read once here. Every value has a sensible
// default (see db.bal) so the service starts with no required env variables;
// the platform overrides these with the real todo-db wiring at deploy time.
import ballerina/os;

configurable string todoDbHost = os:getEnv("TODO_DB_HOST");
configurable string todoDbPort = os:getEnv("TODO_DB_PORT");
configurable string todoDbUser = os:getEnv("TODO_DB_USER");
configurable string todoDbPassword = os:getEnv("TODO_DB_PASSWORD");
configurable string todoDbName = os:getEnv("TODO_DB_DBNAME");
