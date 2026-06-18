function toPaise(amount) {
  const num = Number(amount || 0);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export function shouldVerifyRazorpayPayment({ transactionMode, paymentId }) {
  const mode = String(transactionMode || "").trim().toLowerCase();
  const pid = String(paymentId || "").trim();
  return mode === "razorpay" || pid.startsWith("pay_");
}

export async function fetchRazorpayPayment(paymentId) {
  const keyId = process.env.RAZORPAY_KEY;
  const keySecret = process.env.RAZORPAY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.description || json?.error?.reason || `Razorpay API error (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

export async function verifyRazorpayPaymentCaptured({ paymentId, expectedAmount }) {
  const payment = await fetchRazorpayPayment(paymentId);

  const status = String(payment?.status || "").toLowerCase();
  const captured = payment?.captured === true || status === "captured";

  if (!captured) {
    throw new Error(`Razorpay payment is not captured (status: ${status || "unknown"})`);
  }

  const expectedPaise = toPaise(expectedAmount);
  const razorpayAmount = Number(payment?.amount);

  if (expectedPaise == null || !Number.isFinite(razorpayAmount)) {
    throw new Error("Unable to validate Razorpay payment amount");
  }

  if (razorpayAmount !== expectedPaise) {
    throw new Error(
      `Razorpay amount mismatch. Expected ${expectedPaise}, got ${razorpayAmount}`
    );
  }

  return payment;
}
