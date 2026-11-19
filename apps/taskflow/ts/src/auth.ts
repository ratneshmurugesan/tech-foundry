import { createRemoteJWKSet, jwtVerify, JWTPayload, errors } from "jose";
import { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "./errors";
import { ALLOWED_DOMAINS, PUBLIC_PATHS } from "./constants";
import { requestDb, DOORLESS } from "./identity";
import { getClient, makeRequestDb, isDbInitialized } from "./db";

declare module "fastify" {
    interface FastifyRequest {
        // Augment the request context to include your day 10-11 identity payload
        user?: JWTPayload;
    }
}


const readers = new Map<string, Awaited<ReturnType<typeof createRemoteJWKSet>>>();

export async function doorHook(request: FastifyRequest, reply: FastifyReply) {
    const tenant = process.env.AUTH0_DOMAIN;
    const isPublic = PUBLIC_PATHS.has(request.url.split("?")[0]);

    // Resolve the ONE identity the cellar stamps: doorless (no tenant) or a public path
    // (the webhook) => DOORLESS; otherwise the badge's sub. Postgres RLS binds to this value.
    let identity: string;

    if (!tenant || isPublic) {
        identity = DOORLESS;
    } else {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "No token provided" });
        }
        const token = authHeader.slice(7);

        // The env tenant is trusted operator config. A per-request header may override it,
        // but it is untrusted client input: gate it on the allowlist (else fail closed).
        const envTenant = tenant.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const overrideHeader = request.headers["x-tenant-domain"];
        const activeTenant = overrideHeader
            ? String(overrideHeader).replace(/^https?:\/\//, "").replace(/\/$/, "")
            : envTenant;
        if (overrideHeader && !ALLOWED_DOMAINS.has(activeTenant)) {
            return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: "Signature verification failed" });
        }

        const audience = process.env.AUTH0_AUDIENCE ?? "foundry-taskflow-api-aud";
        try {
            const user = await verifyBadge(token, activeTenant, audience);
            request.user = user;
            identity = (user.sub as string) ?? "";
        } catch (err) {
            if (err instanceof UnauthorizedError) {
                return reply.status(401).send({ statusCode: 401, error: "Unauthorized", message: err.message });
            }
            throw err; // unexpected => 500 via the receptionist, never a silent 401
        }
    }

    // Stamp a DEDICATED connection with the identity and bind it to this request's async
    // context (AsyncLocalStorage). Every downstream read/write in this request sees the stamp,
    // so Postgres RLS filters rows to this identity. The shared pool is never stamped.
    // postgres's Sql pool hands out a DEDICATED connection via reserve() (there is no connect());
    // it is returned to the pool with release() in the onResponse hook (server.ts).
    //
    // Guarded on isDbInitialized(): the DB-free contract tests (lighthouse, doorless, badge,
    // validation) build the app WITHOUT initDb(), and the door must stay open for them — parity
    // with the PY door, which never touches the DB (its stamp is deferred to get_session()). In a
    // real deployment initDb() has run, so this is always true and the door stamps as designed.
    if (isDbInitialized()) {
        const client = getClient();
        const conn = await client.reserve();
        await conn.unsafe("SELECT set_config('app.current_user_id', $1, false)", [identity]);
        requestDb.enterWith(makeRequestDb(conn));
        (request as any).rlsConn = conn; // released in the onResponse hook (server.ts)
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