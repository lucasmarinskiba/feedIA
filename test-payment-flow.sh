#!/bin/bash
set -e

BASE_URL="https://web-production-fa7b5.up.railway.app"
WEBHOOK_SECRET="a2e95096663578a7688cebf0caf5699de597147af0be9702d76be9425607ef0f"

echo "=== TEST 1: Health Check ==="
curl -s $BASE_URL/api/health | jq .

echo ""
echo "=== TEST 2: Create Checkout Session ==="
curl -s -X POST $BASE_URL/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "tierId": "pro",
    "email": "test@example.com"
  }' | jq .

echo ""
echo "=== TEST 3: Webhook Signature Validation ==="
# Create valid signature
DATA_ID="123456"
REQUEST_ID="req-test-001"
TS=$(date +%s)

MANIFEST="id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};"
SIGNATURE=$(echo -n "$MANIFEST" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | awk '{print $2}')

echo "Manifest: $MANIFEST"
echo "Signature: $SIGNATURE"

echo ""
echo "=== TEST 4: Post Webhook (Approved Payment) ==="
curl -s -X POST "$BASE_URL/api/billing/webhook/mercado-pago?data.id=$DATA_ID" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=$TS,v1=$SIGNATURE" \
  -H "x-request-id: $REQUEST_ID" \
  -d '{
    "action": "payment.updated",
    "data": {
      "id": 123456,
      "status": "approved",
      "external_reference": "test-user-123:pro",
      "payer": {
        "email": "test@example.com"
      }
    }
  }' | jq .

echo ""
echo "✅ Payment flow tests complete"
