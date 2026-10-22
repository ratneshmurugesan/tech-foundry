// tests/razorpay.test.ts
//
// Parity twin of py/tests/test_razorpay.py (ADR-014, ADR-015).
// Cellars apart (ADR-010): every test is a pure function or a faked seam — no Postgres,
// no network, no clock. The TS feeds the same inputs and asserts the same strings as the
// py suite (8000 == 8001).
//
//   1. The state machine — `transition()` (fully wired, ADR-015). `paid` serves double
//      duty (initial activation + recovery); the state table disambiguates.
//   2. The event map — `EVENT_MAP`: Razorpay event.name -> machine event (static lookup).
//   3. The signature — `verifySignature()` (client-side payment sig, ADR-014).
//   4. The webhook signature — `verifyWebhookSignature()` (ADR-015, the day-16 seam).
//   5. The plan->role link — the day-10 ladder gains a plan_tier input.
//
// The checkout/verify/webhook ROUTES (py suites 6-8) are TODO in the py file, so they
// are not asserted here — the day's real-code seams (1-5) are the parity surface.

import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { transition, verifySignature, verifyWebhookSignature } from "../src/razorpay";
import { EVENT_MAP } from "../src/constants";
import { assertRole } from "../src/authorize";
import { ForbiddenError } from "../src/errors";

// ---------------------------------------------------------------------------
// 1. The state machine (fully wired, ADR-015)
// ---------------------------------------------------------------------------

describe("1. The state machine (transition)", () => {
    // Full table: `paid` serves double duty (initial activation from trial, recovery
    // from past_due). The state table disambiguates — no state-aware mapping needed.
    it.each([
        ["trial", "paid", "active"],              // initial activation
        ["trial", "payment_failed", null],        // trial can't jump to past_due
        ["trial", "unsubscribe", "canceled"],    // any -> canceled
        ["active", "paid", null],                 // already active; idempotent noop
        ["active", "payment_failed", "past_due"], // the bounce
        ["active", "unsubscribe", "canceled"],   // any -> canceled
        ["past_due", "paid", "active"],           // recovery
        ["past_due", "payment_failed", null],    // already past_due; noop
        ["past_due", "unsubscribe", "canceled"], // any -> canceled
        ["canceled", "paid", null],              // terminal — nothing leaves canceled
        ["canceled", "payment_failed", null],    // terminal
        ["canceled", "unsubscribe", null],       // terminal
    ] as [string, string, string | null][])(
        "transition(%s, %s) == %s",
        (state, event, expected) => {
            expect(transition(state, event)).toBe(expected);
        }
    );
});

// ---------------------------------------------------------------------------
// 2. The webhook event map (static lookup, ADR-015)
// ---------------------------------------------------------------------------

describe("2. The event map (EVENT_MAP)", () => {
    it.each([
        ["payment.captured", "paid"],
        ["payment.failed", "payment_failed"],
        ["refund.created", "unsubscribe"],
        ["subscription.paid", "paid"],
        ["subscription.halted", "payment_failed"],
        ["subscription.cancelled", "unsubscribe"],
    ] as [string, string][])(
        "EVENT_MAP[%s] == %s",
        (razorpayEvent, expected) => {
            expect(EVENT_MAP[razorpayEvent]).toBe(expected);
        }
    );

    it("an unknown event name is not in the map", () => {
        expect(EVENT_MAP["some.unknown.event"]).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// 3. The signature (client-side payment sig, ADR-014)
// ---------------------------------------------------------------------------

const SECRET = "secret";

// The client-side payment signature, exactly as Razorpay's checkout computes it:
// HMAC_SHA256(`${order_id}|${payment_id}`, secret). The amount is deliberately absent.
function sign(orderId: string, paymentId: string, secret: string): string {
    return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

describe("3. The signature (verifySignature)", () => {
    it("accepts the correct signature", () => {
        const sig = sign("order_1", "pay_1", SECRET);
        expect(verifySignature("order_1", "pay_1", 49900, SECRET, sig)).toBe(true);
    });

    it("rejects a wrong signature", () => {
        expect(verifySignature("order_1", "pay_1", 49900, SECRET, "deadbeef")).toBe(false);
    });

    it("does not use the amount in the signature", () => {
        // The amount is NOT part of the payment signature — a different amount must not
        // change the expected HMAC.
        const sig = sign("order_1", "pay_1", SECRET);
        expect(verifySignature("order_1", "pay_1", 999999, SECRET, sig)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 4. The webhook signature (ADR-015, the day-16 real-code seam)
//    Razorpay signs the EXACT request bytes: HMAC_SHA256(raw_body, webhook_secret).
// ---------------------------------------------------------------------------

function webhookSign(rawBody: Buffer, secret: string): string {
    return createHmac("sha256", secret).update(rawBody).digest("hex");
}

describe("4. The webhook signature (verifyWebhookSignature)", () => {
    const WH_SECRET = "wh_secret";
    const body = Buffer.from('{"event":{"name":"payment.captured"}}');

    it("accepts the correct signature", () => {
        const sig = webhookSign(body, WH_SECRET);
        expect(verifyWebhookSignature(body, WH_SECRET, sig)).toBe(true);
    });

    it("rejects a wrong signature", () => {
        expect(verifyWebhookSignature(body, WH_SECRET, "deadbeef")).toBe(false);
    });

    it("rejects a wrong secret", () => {
        const sig = webhookSign(body, WH_SECRET);
        expect(verifyWebhookSignature(body, "wrong_secret", sig)).toBe(false);
    });

    it("rejects a tampered body", () => {
        const sig = webhookSign(body, WH_SECRET);
        const tampered = Buffer.from('{"event":{"name":"refund.created"}}');
        expect(verifyWebhookSignature(tampered, WH_SECRET, sig)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 3. The plan->role link
// ---------------------------------------------------------------------------

const WS = "w-1";
const SUB = "u-1";

// A membership row that is a plain member — the ladder's input before the plan link.
async function asMember(_wsId: string, _userId: string) {
    return { role: "member" as const };
}

describe("3. The plan->role link (assertRole)", () => {
    it("a free member stays read-only (403)", async () => {
        let threw = false;
        try {
            await assertRole(WS, SUB, "owner", asMember, "free");
        } catch (e) {
            threw = true;
            expect(e).toBeInstanceOf(ForbiddenError);
            expect((e as ForbiddenError).message).toBe("Requires the owner role");
        }
        expect(threw).toBe(true);
    });

    it("a starter member lifts to owner (no raise)", async () => {
        await expect(assertRole(WS, SUB, "owner", asMember, "starter")).resolves.toBeUndefined();
    });

    it("the default tier leaves the ladder untouched (403)", async () => {
        let threw = false;
        try {
            await assertRole(WS, SUB, "owner", asMember);
        } catch (e) {
            threw = true;
            expect(e).toBeInstanceOf(ForbiddenError);
            expect((e as ForbiddenError).message).toBe("Requires the owner role");
        }
        expect(threw).toBe(true);
    });
});
