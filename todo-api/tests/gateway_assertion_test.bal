// Verifies the gateway assertion wiring (gateway_assertion.bal), copied
// verbatim from the `ballerina` skill, is actually enforced by this service.
//
// Run with a throwaway RSA keypair as the trust anchor — see
// tests/resources/{valid_key,valid_cert,wrong_key}.pem, generated with
// openssl and never used anywhere else. GATEWAY_ASSERTION_CERTIFICATE,
// GATEWAY_ASSERTION_ISSUER and GATEWAY_ASSERTION_HEADER must be exported
// (matching valid_cert.pem / TEST_ISSUER / TEST_HEADER below) BEFORE `bal
// test` starts: the interceptor reads them once, at module init, and a
// missing trio silently drops to the unverified fallback instead of failing
// these tests loudly.
//
// This contract (openapi.yaml) declares no `security: []` operation — every
// one of its three operations requires a signed-in caller — so there is no
// real "public route" to exercise. Case 4 below exercises the same
// interceptor code path a public route would rely on (no assertion header at
// all continues with no caller set on the context) and shows the
// distinction from cases 2-3: an ABSENT assertion is not an error at the
// interceptor, only a PRESENT-but-invalid one is; the 401 in case 4 comes
// from this service's own `requireGatewayCaller`, not the interceptor.
import ballerina/crypto;
import ballerina/http;
import ballerina/jwt;
import ballerina/test;

const string VALID_KEY_PATH = "tests/resources/valid_key.pem";
const string WRONG_KEY_PATH = "tests/resources/wrong_key.pem";
const string TEST_ISSUER = "aep-gateway-test";
const string TEST_HEADER = "x-jwt-assertion";

final http:Client testClient = check new ("http://localhost:9090");

function mintAssertion(string keyPath, string userId) returns string|error {
    crypto:PrivateKey signingKey = check crypto:decodeRsaPrivateKeyFromKeyFile(keyPath);
    jwt:IssuerConfig issuerConfig = {
        issuer: TEST_ISSUER,
        username: userId,
        expTime: 300,
        customClaims: {
            "username": userId,
            "scope": "todos:read todos:create todos:complete",
            "ouHandle": "acme"
        },
        signatureConfig: {
            config: signingKey
        }
    };
    return check jwt:issue(issuerConfig);
}

// Flips the last character of the payload segment so the signature no
// longer matches — a tampered claim, not a malformed token.
function tamperPayload(string token) returns string {
    string[] parts = re `\.`.split(token);
    string payload = parts[1];
    string lastChar = payload.substring(payload.length() - 1, payload.length());
    string flipped = lastChar == "A" ? "B" : "A";
    string tamperedPayload = payload.substring(0, payload.length() - 1) + flipped;
    return parts[0] + "." + tamperedPayload + "." + parts[2];
}

@test:Config {}
function testValidAssertionIsAccepted() returns error? {
    string token = check mintAssertion(VALID_KEY_PATH, "test-user-1");
    http:Response res = check testClient->get("/me/todos", {[TEST_HEADER]: token});
    test:assertEquals(res.statusCode, 200);
}

@test:Config {}
function testAssertionSignedByWrongKeyIsUnauthorized() returns error? {
    string token = check mintAssertion(WRONG_KEY_PATH, "test-user-1");
    http:Response res = check testClient->get("/me/todos", {[TEST_HEADER]: token});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function testTamperedAssertionIsUnauthorized() returns error? {
    string token = check mintAssertion(VALID_KEY_PATH, "test-user-1");
    string tampered = tamperPayload(token);
    http:Response res = check testClient->get("/me/todos", {[TEST_HEADER]: tampered});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function testNoAssertionOnProtectedResourceIsUnauthorized() returns error? {
    http:Response res = check testClient->get("/me/todos");
    test:assertEquals(res.statusCode, 401);
}
