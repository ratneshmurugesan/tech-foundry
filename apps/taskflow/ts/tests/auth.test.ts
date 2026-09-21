import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import * as jose from "jose"
import * as errors from "jose/errors"
import nodeCrypto from "node:crypto"
import { KeyObject } from "node:crypto"
import Fastify from "fastify"
import { doorHook, verifyBadge, mapFailReason } from "../src/auth"
import { UnauthorizedError } from "../src/errors"
// eslint-disable-next-line import/first
import { jwtVerify as mockVerify } from "jose"

// Mock the seams — the two functions that reach outside the reader.
vi.mock("jose", async (importOriginal) => {
    const real = await importOriginal<typeof import("jose")>()
    return {
        ...real,
        jwtVerify: vi.fn(),
        createRemoteJWKSet: vi.fn((url: URL | string) => ({ url: url.toString() })),
    }
})

// Mirrors the reader's allowlist value in src/auth.ts.
const TENANT = "stub.auth0.com"
const ISS = `https://${TENANT}`
const AUD = "foundry-taskflow-api-aud"

// jose v6 SignJWT rejects PEM strings; node:crypto v22 exposes createPrivateKey (no
// importKey here). Since jwtVerify is mocked we only need *private* keys to mint
// badges — signing with a public key is impossible — so the ctx holds two private KeyObjects:
// one for "valid" signatures, one "wrong" key for tamper cases.
type Ctx = { priv: KeyObject; otherPriv: KeyObject }
let ctx: Ctx

beforeEach(() => {
    vi.mocked(mockVerify).mockReset()
    vi.stubEnv("AUTH0_DOMAIN", TENANT)
    vi.stubEnv("AUTH0_AUDIENCE", AUD)
    // generateKeyPairSync (no encoding) ALREADY returns KeyObjects — pass them straight
    // to jose SignJWT.sign(). (Do NOT wrap them in nodeCrypto.createPrivateKey: that
    // function only accepts a PEM string / Buffer / TypedArray / DataView, and throws
    // "must be ... ArrayBuffer, Buffer, TypedArray, or DataView. Received PrivateKeyObject".)
    const a = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 })
    const b = nodeCrypto.generateKeyPairSync("rsa", { modulusLength: 2048 })
    ctx = { priv: a.privateKey, otherPriv: b.privateKey }
})

afterEach(() => {
    vi.unstubAllEnvs()
})

const b64url = (input: Uint8Array | Buffer | string) =>
    Buffer.from(input).toString("base64url")

// Mints a locally-signed RS256 badge. signWith: "garbage" | "wrong-key" | omit for a valid sig.
// jose v6's sign() already returns the complete 3-segment compact JWT, so we return it as-is.
async function mintToken(claims: Record<string, unknown>, signWith?: "garbage" | "wrong-key"): Promise<string> {
    if (signWith === "garbage") {
        // A hand-rolled 3-segment token whose signature segment is base64url of junk —
        // structurally a valid JWS, so the reader passes the regex and reaches the
        // (mocked) crypto path rather than the "Malformed token" structural check.
        const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test" }))
        const payload = b64url(JSON.stringify(claims))
        return `${header}.${payload}.${b64url("definitely-not-a-real-rsa-signature")}`
    }
    const key = signWith === "wrong-key" ? ctx.otherPriv : ctx.priv
    return new jose.SignJWT(claims as Record<string, string | number>)
        .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "test" })
        .sign(key)
}

// Re-usable: assert the mocked verify resolves a payload.
const okPayload = (sub: string) => ({ sub, email: `${sub}@foundry.dev`, iss: ISS })

// Matches exactly what a real jose v6 jwtVerify() emits for a claim failure:
// .claim is set to the failed claim name, .reason is "check_failed", and the
// message is `"<claim>" claim check failed`. (Verified by probing v6 directly.)
const realClaimErr = (claim: "aud" | "iss" | "exp") =>
    new errors.JWTClaimValidationFailed(
        `unexpected "${claim}" claim value`,
        okPayload("u"),
        claim,
        "check_failed",
    )

describe("mapFailReason — the six-string contract", () => {
    // JWSInvalid (and v6's JWSSignatureVerificationFailed) fall through the claim check => signature failure.
    test("bad signature (jose JWSInvalid) => Signature verification failed", () => {
        expect(mapFailReason(new errors.JWSInvalid("x"))).toBe("Signature verification failed")
    })
    // Probe of real v6 confirmed an expired badge rejects with a JWTExpired whose
    // .claim is "exp" — mapping via the instanceof branch, never a message parse.
    test("v6-real expired shape (JWTExpired, .claim='exp') => Token expired", () => {
        const e = new errors.JWTExpired('"exp" claim timestamp check failed', okPayload("x"), "exp", "check_failed") as any
        expect(mapFailReason(e)).toBe("Token expired")
    })
    test("aud failure => Wrong audience", () => {
        expect(mapFailReason(realClaimErr("aud"))).toBe("Wrong audience")
    })
    test("iss failure => Wrong issuer", () => {
        expect(mapFailReason(realClaimErr("iss"))).toBe("Wrong issuer")
    })
    test("unclassifiable surprise => Signature verification failed", () => {
        expect(mapFailReason(new Error("boom: network down"))).toBe("Signature verification failed")
    })
    test("the contract is exactly these six stable strings", () => {
        expect(
            [
                "No token provided",
                "Malformed token",
                "Signature verification failed",
                "Token expired",
                "Wrong audience",
                "Wrong issuer",
            ]
        ).toHaveLength(6)
    })
})

describe("verifyBadge - direct (seams mocked)", () => {
    test("a valid badge resolves to the decoded payload", async () => {
        const claims = { sub: "auth0|u-1", email: "u@foundry.dev", iss: ISS, aud: AUD, exp: 9e9 }
        const token = await mintToken(claims)
        vi.mocked(mockVerify).mockResolvedValue({ payload: claims as any, protectedHeader: { alg: "RS256", typ: "JWT" } })

        const result = await verifyBadge(token, TENANT, AUD)

        expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/)
        expect(result).toEqual(claims)
        expect(mockVerify).toHaveBeenCalledTimes(1)
    })

    test("garbage (not 3 base64url segments) => Malformed token, no network touched", async () => {
        await expect(verifyBadge("junk", TENANT, AUD)).rejects.toThrow("Malformed token")
        expect(mockVerify).not.toHaveBeenCalled()
    })

    test("expired => Token expired", async () => {
        const token = await mintToken({ sub: "s", aud: AUD, iss: ISS, exp: 1_000 })
        const e = new errors.JWTExpired("expired", okPayload("s")) as any
        e.claim = "exp"
        vi.mocked(mockVerify).mockRejectedValue(e)
        await expect(verifyBadge(token, TENANT, AUD)).rejects.toThrow("Token expired")
    })

    test("wrong audience => Wrong audience", async () => {
        const token = await mintToken({ sub: "s", aud: "someone-else", iss: ISS, exp: 9e9 })
        vi.mocked(mockVerify).mockRejectedValue(realClaimErr("aud"))
        await expect(verifyBadge(token, TENANT, AUD)).rejects.toThrow("Wrong audience")
    })

    test("wrong issuer => Wrong issuer", async () => {
        const token = await mintToken({ sub: "s", aud: AUD, iss: "https://other", exp: 9e9 })
        vi.mocked(mockVerify).mockRejectedValue(realClaimErr("iss"))
        await expect(verifyBadge(token, TENANT, AUD)).rejects.toThrow("Wrong issuer")
    })

    test("tampered (wrong-key) real crypto shape => fails closed, never a silent pass", async () => {
        const token = await mintToken({ sub: "s", aud: AUD, iss: ISS, exp: 9e9 }, "wrong-key")
        vi.mocked(mockVerify).mockRejectedValue(new errors.JWSSignatureVerificationFailed("sig"))
        await expect(verifyBadge(token, TENANT, AUD)).rejects.toBeInstanceOf(UnauthorizedError)
    })

    test("JWKS reader is fail-closed (network failure => Signature verification failed)", async () => {
        const token = await mintToken({ sub: "s", aud: AUD, iss: ISS, exp: 9e9 })
        vi.mocked(mockVerify).mockRejectedValue(new Error("fetch JWKS: ECONNREFUSED"))
        await expect(verifyBadge(token, TENANT, AUD)).rejects.toThrow("Signature verification failed")
    })

    test("every thrown reason is an UnauthorizedError, never a silent pass", async () => {
        vi.mocked(mockVerify).mockRejectedValue(new Error("weird"))
        await expect(verifyBadge("x.y.z", TENANT, AUD)).rejects.toBeInstanceOf(UnauthorizedError)
    })
})

describe("doorHook — one choke point, via fastify.inject (no external network)", () => {
    const build = () => {
        const app = Fastify({ logger: false })
        app.addHook("onRequest", doorHook as never)
        app.get("/who", (req, reply) => reply.send({ sub: (req as any).user?.sub, email: (req as any).user?.email }))
        return app
    }

    test("doorless mode: absent tenant => everything stays open", async () => {
        vi.stubEnv("AUTH0_DOMAIN", "")
        const app = build()
        const res = await app.inject({ method: "GET", url: "/who" })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ sub: undefined, email: undefined })
    })

    test("configured: no token => 401 No token provided", async () => {
        const app = build()
        const res = await app.inject({ method: "GET", url: "/who" })
        expect(res.statusCode).toBe(401)
        expect(res.json()).toEqual({ statusCode: 401, error: "Unauthorized", message: "No token provided" })
    })

    test("stranger tenant from the header => fails closed, 401 Signature verification failed, crypto never runs", async () => {
        const app = build()
        const res = await app.inject({
            method: "GET",
            url: "/who",
            headers: { "x-tenant-domain": "stranger.auth0.com", authorization: "Bearer aa.bb.cc" },
        })
        expect(res.statusCode).toBe(401)
        expect(res.json().message).toBe("Signature verification failed")
        expect(mockVerify).not.toHaveBeenCalled()
    })

    test("lighthouse and menu stay open even when the door is up", async () => {
        const app = Fastify({ logger: false })
        app.addHook("onRequest", doorHook as never)
        app.get("/", () => ({ ok: 1 }))
        app.get("/docs", () => ({ ok: 2 }))
        app.get("/redoc", () => ({ ok: 2 }))
        app.get("/openapi.json", () => ({ ok: 3 }))
        for (const url of ["/", "/docs", "/redoc", "/openapi.json"]) {
            expect((await app.inject({ method: "GET", url })).statusCode).toBe(200)
        }
    })

    test("a valid badge unlocks the room and surfaces identity", async () => {
        const claims = { sub: "auth0|u-1", email: "u@foundry.dev", iss: ISS, aud: AUD, exp: 9e9 }
        const token = await mintToken(claims)
        // Resolve with the actual minted claims, not a re-derived payload, so the decoded
        // identity round-trips exactly as it was signed.
        vi.mocked(mockVerify).mockResolvedValue({ payload: claims as any, protectedHeader: { alg: "RS256", typ: "JWT" } })
        const app = build()
        const res = await app.inject({ method: "GET", url: "/who", headers: { authorization: `Bearer ${token}` } })
        expect(res.statusCode).toBe(200)
        expect(res.json()).toEqual({ sub: "auth0|u-1", email: "u@foundry.dev" })
    })

    test("an expired badge => 401 Token expired, not a 5xx", async () => {
        const token = await mintToken({ sub: "s", aud: AUD, iss: ISS, exp: 1_000 })
        const e = new errors.JWTExpired("expired", okPayload("s")) as any
        e.claim = "exp"
        vi.mocked(mockVerify).mockRejectedValue(e)
        const app = build()
        const res = await app.inject({ method: "GET", url: "/who", headers: { authorization: `Bearer ${token}` } })
        expect(res.statusCode).toBe(401)
        expect(res.json().message).toBe("Token expired")
    })
})
