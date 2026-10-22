import { createHmac, timingSafeEqual } from "node:crypto";
import { RAZORPAY_API, TRANSITIONS } from "./constants";

// The plan state machine (ADR-014, fully wired ADR-015). Returns the next state, or null
// if the (state, event) pair is not in the table (the "refused" / no-op case).
// Mirrors py `razorpay.py::transition`.
export function transition(state: string, event: string): string | null {
    return TRANSITIONS[state]?.[event] ?? null;
}

// The ONE real-code seam of the day: verify the client-side payment signature
// = HMAC_SHA256(`${order_id}|${payment_id}`, secret). `amount` is accepted for parity with
// the order but is NOT part of the payment signature. Constant-time compare (no timing
// oracle). Sync — mirrors the py pure function.
export function verifySignature(
    orderID: string,
    paymentID: string,
    amount: number,
    keySecret: string,
    signature: string
): boolean {
    void amount; // accepted for parity with the order; not part of the payment signature
    const expected = createHmac("sha256", keySecret)
        .update(`${orderID}|${paymentID}`)
        .digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(expectedBuf, sigBuf);
}

// The day-16 real-code seam (ADR-015): verify the server-side webhook signature
// = HMAC_SHA256(rawBody, webhookSecret). Razorpay signs the EXACT request bytes (the raw
// body, not a re-serialized JSON). Constant-time compare (no timing oracle). Pure.
// Mirrors py `razorpay.py::verify_webhook_signature`.
export function verifyWebhookSignature(
    rawBody: Buffer,
    secret: string,
    signature: string
): boolean {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(expectedBuf, sigBuf);
}

// The ONE outbound network call (Razorpay order creation). `fetchImpl` is injectable so
// tests can fake the cashier without a network (the py monkeypatches httpx.AsyncClient).
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

async function defaultFetch(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, init);
}

export async function createOrder(
    keyId: string,
    keySecret: string,
    amount: number,
    currency: string,
    receipt: string,
    fetchImpl: Fetch = defaultFetch
): Promise<Record<string, unknown>> {
    const payload = { amount, currency, receipt };
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const r = await fetchImpl(`${RAZORPAY_API}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
    });
    if (!r.ok) {
        throw new Error(`Razorpay order creation failed: ${r.status}`);
    }
    return (await r.json()) as Record<string, unknown>;
}