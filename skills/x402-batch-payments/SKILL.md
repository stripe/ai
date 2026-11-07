---
name: x402-batch-payments
description: >-
  Guides agents through x402-powered batch USDC payments on Base using the
  Spraay gateway. Use when the user wants to pay multiple recipients in a
  single on-chain transaction, distribute funds to a list of addresses, or
  build agent-driven payouts that settle on Base via the x402 payment
  protocol.
metadata:
  short-description: Batch USDC payments on Base via x402

---

# x402 Batch Payments

Send USDC to multiple recipients in a single on-chain transaction on Base using the [x402 payment protocol](https://www.x402.org/) and the [Spraay batch gateway](https://gateway.spraay.app).

Stripe supports x402 as a payment protocol for machine-to-machine commerce. This skill shows how an agent can use x402 to pay for a batch payment API call that settles multiple recipients on-chain in one transaction.

## How it works

1. The agent calls the Spraay gateway's batch endpoint.
2. The gateway returns HTTP 402 with an x402 payment challenge.
3. The agent signs an EIP-3009 `transferWithAuthorization` for USDC on Base to pay the $0.02 API fee.
4. The agent resends the request with the signed payment in the `X-PAYMENT` header.
5. The gateway verifies payment, settles it on-chain, and returns an unsigned batch transaction.
6. The agent signs and broadcasts the batch transaction to Base.

The batch settles through the Spraay contract on Base (`0x1646452F98E36A3c9Cfc3eDD8868221E207b5eEC`). The contract charges a 0.3% fee on the total amount, added on top (the sender's token allowance must cover the total plus the fee). Maximum 200 recipients per batch.

## Prerequisites

- A funded wallet with USDC on Base (for both the x402 API fee and the batch amount).
- An EVM private key the agent can sign with.
- Node.js 18+ or Python 3.11+.

Install the x402 client library:

```bash
# TypeScript
npm install @x402/fetch @x402/evm

# Python
pip install x402[requests,evm]
```

## Safety Rules

1. Never send a batch payment unless the user explicitly asks to distribute funds.
2. Before signing any transaction, show the user the full recipient list, amounts, and total cost (including the 0.3% protocol fee) and get confirmation.
3. Amounts in the batch request body are in **raw base units** (6 decimals for USDC). 1 USDC = `"1000000"`. Never pass human-decimal strings to the batch endpoint.
4. Never reuse a signed x402 payment header across requests.
5. Do not sign or broadcast a transaction the gateway returns without first verifying that `transaction.to` matches the Spraay contract (`0x1646452F98E36A3c9Cfc3eDD8868221E207b5eEC`), `transaction.chainId` is `8453` (Base), and the decoded calldata recipients and amounts match what the user confirmed.
6. Do not store or log private keys. Treat `EVM_PRIVATE_KEY` as a secret.

## Endpoints

All endpoints are on `https://gateway.spraay.app`.

### Free (no x402 payment required)

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/free/validate-batch` | POST | Validate recipient addresses and token before sending |
| `/free/estimate-batch` | POST | Estimate gas cost for a batch |
| `/free/prices` | GET | Current token prices (ETH, USDC, SOL, USDG) |
| `/free/chain-status` | GET | Chain health and block numbers |

### Paid (x402, USDC on Base)

| Endpoint | Method | Price | Purpose |
| --- | --- | --- | --- |
| `/api/v1/batch/estimate` | POST | $0.001 | Detailed gas estimate with `suggestedGasLimit` |
| `/api/v1/batch/execute` | POST | $0.02 | Build an unsigned batch transaction |
| `/api/v1/balances` | GET | $0.005 | Check wallet balances (`?address=0x...`) |

## Workflow

Follow these steps in order. Do not skip the validation or estimation steps.

### Step 1 — Validate the batch

```bash
curl -s -X POST https://gateway.spraay.app/free/validate-batch \
  -H "Content-Type: application/json" \
  -d '{
    "token": "USDC",
    "recipients": ["0xRecipient1", "0xRecipient2"],
    "amounts": ["1000000", "2000000"],
    "chain": "base"
  }'
```

Check that `valid` is `true`. If any address is invalid, stop and tell the user.

### Step 2 — Estimate the cost

```bash
curl -s -X POST https://gateway.spraay.app/free/estimate-batch \
  -H "Content-Type: application/json" \
  -d '{
    "token": "USDC",
    "recipientCount": 2,
    "chain": "base"
  }'
```

This returns a gas estimate. Show the user the estimated gas cost alongside the 0.3% protocol fee so they can confirm the total spend.

### Step 3 — Confirm with the user

Present a summary before proceeding:

- **Recipients:** (list each address and amount in human-readable USDC)
- **Subtotal:** sum of all amounts
- **Protocol fee:** 0.3% of the subtotal
- **Total USDC needed:** subtotal + fee
- **x402 API fee:** $0.02 USDC
- **Estimated gas:** from Step 2

Wait for explicit user confirmation before continuing.

### Step 4 — Execute the batch via x402

The paid `/api/v1/batch/execute` endpoint requires x402 payment. Use the x402 client library to handle the payment flow automatically.

**TypeScript example:**

```typescript
import { fetchWithPayment } from "@x402/fetch";
import { createViemPaymentSigner } from "@x402/evm";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http("https://mainnet.base.org"),
});
const paymentSigner = createViemPaymentSigner(walletClient);

const response = await fetchWithPayment(
  "https://gateway.spraay.app/api/v1/batch/execute",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "USDC",
      recipients: ["0xRecipient1", "0xRecipient2"],
      amounts: ["1000000", "2000000"],
      sender: account.address,
    }),
  },
  paymentSigner
);

const result = await response.json();
// result.transaction contains the unsigned batch transaction
// result.approvalRequired contains the ERC-20 approval details if needed
```

**Python example:**

```python
from x402.client import create_x402_client

client = create_x402_client(
    private_key=os.environ["EVM_PRIVATE_KEY"],
    network="eip155:8453",
)

response = client.post(
    "https://gateway.spraay.app/api/v1/batch/execute",
    json={
        "token": "USDC",
        "recipients": ["0xRecipient1", "0xRecipient2"],
        "amounts": ["1000000", "2000000"],
        "sender": client.address,
    },
)
result = response.json()
```

### Step 5 — Handle the response

The gateway returns an unsigned transaction:

```json
{
  "transaction": {
    "to": "0x1646452F98E36A3c9Cfc3eDD8868221E207b5eEC",
    "data": "0x...",
    "value": "0",
    "chainId": 8453,
    "gasLimit": "0x..."
  },
  "approvalRequired": {
    "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "spender": "0x1646452F98E36A3c9Cfc3eDD8868221E207b5eEC",
    "amount": "3009000",
    "amountFormatted": "3.009"
  },
  "summary": { ... }
}

```

Before signing:

1. Verify `transaction.to` is `0x1646452F98E36A3c9Cfc3eDD8868221E207b5eEC`.
2. Verify `transaction.chainId` is `8453`.
3. Verify `transaction.value` is `"0"` (ERC-20 batch, not native ETH).
4. If `approvalRequired` is present, the sender must first approve the contract to spend the stated amount of USDC, then send the batch transaction.

### Step 6 — Sign and broadcast

```typescript
// If approval is needed
if (result.approvalRequired) {
  const approvalTx = await walletClient.writeContract({
    address: result.approvalRequired.token,
    abi: [{ name: "approve", type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" }],
    functionName: "approve",
    args: [result.approvalRequired.spender, BigInt(result.approvalRequired.amount)],
  });
  // Wait for approval confirmation before proceeding
}

// Send the batch transaction
const txHash = await walletClient.sendTransaction({
  to: result.transaction.to,
  data: result.transaction.data,
  value: BigInt(result.transaction.value),
  gas: BigInt(parseInt(result.transaction.gasLimit, 16)),
});
```

## Error handling

| HTTP Status | Meaning | Action |
| --- | --- | --- |
| 402 | x402 payment required | The x402 client library handles this automatically. If using raw HTTP, read the `WWW-Authenticate` header for payment instructions. |
| 400 | Invalid request | Check that all addresses are valid checksummed hex, amounts are strings of raw base units, and `token` is `"USDC"`. |
| 409 | Duplicate payment detected | The gateway's replay guard rejected a repeated request. Do not retry with the same parameters in quick succession. Wait and use a fresh x402 payment. |

## Key facts

- **Batch contract (Base):** `0x1646452F98E36A3c9Cfc3eDD8868221E207b5eEC`
- **USDC on Base:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Protocol fee:** 0.3% of the batch total, added on top
- **Max recipients:** 200 per transaction
- **Settlement chain:** Base (chain ID 8453). The `chain` parameter also accepts `"peaq"` (chain ID 3338) for peaq network settlement.
- **x402 payment asset:** USDC on Base, facilitated by Coinbase CDP
- **Gateway:** `https://gateway.spraay.app`
- **Documentation:** `https://docs.spraay.app`
- **x402 protocol spec:** `https://www.x402.org`

## Related Stripe concepts

- [Stripe x402 payments](https://docs.stripe.com/payments/machine/x402) — Stripe's own x402 integration for USDC machine-to-machine payments on Base.
- [Machine payments](https://docs.stripe.com/payments/machine) — Stripe's framework for autonomous agent payments, including x402 and MPP.
- [Stripe MCP server](https://docs.stripe.com/mcp) — Use alongside this skill to combine Stripe billing with on-chain batch settlement.
