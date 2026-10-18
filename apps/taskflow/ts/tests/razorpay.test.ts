// tests/razorpay.test.ts
//
// Parity twin of py/tests/test_razorpay.py (ADR-014, the day-12 feature).
// Cellars apart (ADR-010): every test is a pure function or a faked seam — no Postgres,
// no network, no clock. The TS feeds the same inputs and asserts the same strings as the
// py suite (8000 == 8001).
//
//   1. The state machine — `transition()` is the whole day. Only trial->paid->active is
//      wired; every other (state, event) pair returns null (the named-but-not-wired
//      transitions of the webhook day read as "refused" until they ship).
//   2. The signature — `verifySignature()` is the ONE real-code seam. HMAC over
//      order_id|payment_id; the amount is NOT part of it.
//   3. The plan->role link — the day-10 ladder gains a plan_tier input. A free member
//      stays read-only; a starter member lifts to owner; the default (undefined) leaves
//      the ladder untouched.
//
// The checkout/verify ROUTES (py suites 4 & 5) are TODO in the py file, so they are not
// asserted here — the day's real-code seams (1-3) are the parity surface.

import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { transition, verifySignature } from "../src/razorpay";
import { assertRole } from "../src/authorize";
import { ForbiddenError } from "../src/errors";

// ---------------------------------------------------------------------------
// 1. The state machine
// ---------------------------------------------------------------------------

describe("1. The state machine (transition)", () => {
    // The ONE wired transition is trial->paid->active. Everything else is a named-but-
    // not-wired pair (the webhook day) and must read as "refused" (null).
    it.each([
        ["trial", "paid", "active"],
        ["trial", "payment_failed", null],
        ["trial", "payment_recovered", null],
        ["trial", "unsubscribe", null],
        ["active", "payment_failed", null],
        ["active", "payment_recovered", null],
        ["active", "unsubscribe", null],
        ["past_due", "payment_recovered", null],
        ["past_due", "unsubscribe", null],
        ["canceled", "paid", null],
        ["canceled", "payment_recovered", null],
        ["canceled", "unsubscribe", null],
    ] as [string, string, string | null][])(
        "transition(%s, %s) == %s",
        (state, event, expected) => {
            expect(transition(state, event)).toBe(expected);
        }
    );
});

// ---------------------------------------------------------------------------
// 2. The signature
// ---------------------------------------------------------------------------

const SECRET = "secret";

// The client-side payment signature, exactly as Razorpay's checkout computes it:
// HMAC_SHA256(`${order_id}|${payment_id}`, secret). The amount is deliberately absent.
function sign(orderId: string, paymentId: string, secret: string): string {
    return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

describe("2. The signature (verifySignature)", () => {
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
