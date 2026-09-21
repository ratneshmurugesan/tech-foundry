import { createRemoteJWKSet, jwtVerify, JWTPayload, errors } from "jose";
import { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "./errors";

declare module "fastify" {
    interface FastifyRequest {
        // Augment the request context to include your day 10-11 identity payload
        user?: JWTPayload;
    }
}

// Tenants the reader will ever trust; a stranger tenant from the header fails closed.
const ALLOWED_DOMAINS = new Set(["dev-qr8x8ecg3nfb603i.uk.auth0.com"]);
// Street (lighthouse "/") + menu + lighthouse "/health" stay open (mirrors the PY set).
const PUBLIC_PATHS = new Set<string>(["/", "/docs", "/redoc", "/openapi.json", "/health"]);

const readers = new Map<string, Awaited<ReturnType<typeof createRemoteJWKSet>>>();

export async function doorHook(request: FastifyRequest, reply: FastifyReply) {
    // Doorless-auth (ADR-010): no tenant configured => the reader is absent entirely.
    const tenant = process.env.AUTH0_DOMAIN;
    if (!tenant || PUBLIC_PATHS.has(request.url.split("?")[0])) return;

    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "No token provided" })
    }

    const token = authHeader.slice(7);

    // Normalize the env tenant (trusted operator config) — used directly.
    const envTenant = tenant.replace(/^https?:\/\//, "").replace(/\/$/, "");
    // A per-request header may override the tenant, but it is untrusted client
    // input: gate it on the allowlist, else fail closed. Without the header we
    // use the trusted env tenant as-is (no allowlist check — a single-tenant
    // allowlist must not block the configured tenant itself).
    const overrideHeader = request.headers["x-tenant-domain"];
    const isActive = overrideHeader ? String(overrideHeader).replace(/^https?:\/\//, "").replace(/\/$/, "") : envTenant;
    if (overrideHeader && !ALLOWED_DOMAINS.has(isActive)) {
        return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Signature verification failed" });
    }
    const activeTenant = isActive;

    const audience = process.env.AUTH0_AUDIENCE ?? "foundry-taskflow-api-aud";

  try {
    request.user = await verifyBadge(token, activeTenant, audience);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: err.message })
    }
    throw err // unexpected => 500 via the receptionist, never a silent 401
  }
}

// Pure verifier — no HTTP knowledge. Returns the badge payload, or throws UnauthorizedError.
export async function verifyBadge(token: string, tenant: string, audience: string): Promise<JWTPayload> {
    // Structural pre-check BEFORE the crypto path: garbage reads "Malformed", never a signature failure.
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
        throw new UnauthorizedError("Malformed token");
    }
    
    try {
        // Auth0 appends a trailing slash to iss (https://{domain}/); the expected
        // issuer must carry it or jose's exact iss match rejects a valid token.
        const { payload } = await jwtVerify(token, await jwksFor(tenant), {
            algorithms: ["RS256"], // the only ink we accept
            issuer: `https://${tenant}/`,
            audience,
        });
        return payload;
    } catch (err) {
        throw new UnauthorizedError(mapFailReason(err as Error));
    }
}

// Six-string contract, driven by jose v6's error types.
// A real jwtVerify() failure sets err.claim to the failed claim (aud / iss / exp),
// so the instanceof read is sufficient — no message parsing needed.
// Everything else (JWSInvalid, JWSSignatureVerificationFailed, fetch/network,
// and any unclassifiable surprise) fails closed to the same signature string —
// never a silent pass.
export function mapFailReason(err: Error): string {
    if (err instanceof errors.JWTExpired) return "Token expired"
    if (err instanceof errors.JWTClaimValidationFailed) {
        const claim = (err as errors.JWTClaimValidationFailed).claim
        if (claim === "exp") return "Token expired"
        if (claim === "aud") return "Wrong audience"
        if (claim === "iss") return "Wrong issuer"
    }
    return "Signature verification failed"
}

// JWKS reader: one remote set per tenant, reused for the lifetime of the process.
function jwksFor(tenant: string) {
    let reader = readers.get(tenant);
    if (!reader) {
        reader = createRemoteJWKSet(new URL(`https://${tenant}/.well-known/jwks.json`));
        readers.set(tenant, reader);
    }
    return reader;
}