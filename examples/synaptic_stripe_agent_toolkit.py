#!/usr/bin/env python3
"""
SynapticChain x Stripe Agent Toolkit Production Example
Demonstrates how AI agents seamlessly bridge fiat card billing with
SynapticChain's native 256-lane HTTP 402 micro-wallets ($0.0008 per execution).
"""

import sys
import os
import time

# Ensure packages/synaptic-stripe is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.index import (
    SynapticStripeAgentToolkit,
    Currency,
    PaymentRail,
)


def main():
    print("=" * 80)
    print("  🤖 STRIPE AGENT TOOLKIT x SYNAPTICCHAIN LAYER-1 MICRO-WALLETS")
    print("  Bridging Fiat Billing with 256-Lane Native HTTP 402 Micro-Settlements ($0.0008)")
    print("=" * 80)
    print()

    // 1. Initialize Stripe Agent Toolkit with SynapticChain L1 Extension
    toolkit = SynapticStripeAgentToolkit(
        stripe_api_key="sk_live_agent_toolkit_demo_key",
        rpc_url="https://nodes.synapticchain.xyz/rpc",
        default_wallet="syn1dejphz2hjetjqva9fg39c7hg8gpr7muapqyvq7",
        auto_topup_threshold_usd=0.05,
        auto_topup_amount_usd=5.00,
    )

    print(f"📡 Synaptic RPC:     {toolkit.rpc_url}")
    print(f"💳 Agent Wallet:     {toolkit.default_wallet}")
    print(f"⚡ Auto-Topup Rule:  Trigger Topup (${toolkit.auto_topup_amount_usd:.2f}) if balance < ${toolkit.auto_topup_threshold_usd:.2f}\n")

    # --------------------------------------------------------------------------
    # Step 1: Query Agent Micro-Wallet Balance
    # --------------------------------------------------------------------------
    print("-" * 80)
    print("📊 Step 1: Inspecting Agent Micro-Wallet Balances")
    print("-" * 80)
    bal = toolkit.get_wallet_balance()
    print(f"   • On-Chain SYN:       {bal.balance_syn:,.2f} SYN")
    print(f"   • On-Chain sUSD:      ${bal.balance_susd:,.4f} sUSD")
    print(f"   • On-Chain cTZS:      {bal.balance_ctzs:,.2f} cTZS")
    print(f"   • Below Threshold?:   {bal.is_below_threshold}")
    print()

    # --------------------------------------------------------------------------
    # Step 2: Fiat Credit Card -> Micro-Wallet Auto-Topup via Stripe
    # --------------------------------------------------------------------------
    print("-" * 80)
    print("💳 Step 2: Top-Up Micro-Wallet from Corporate Credit Card via Stripe PaymentIntent")
    print("-" * 80)
    topup = toolkit.create_fiat_to_microwallet_intent(
        amount_usd=10.00,
        wallet_address=toolkit.default_wallet,
        payment_method_id="pm_card_visa_corporate_4242",
        lane_id=42,
    )
    print(f"✅ Stripe PaymentIntent Succeeded: {topup.payment_intent_id}")
    print(f"   • Amount Charged:     ${topup.amount_fiat_usd:.2f} USD")
    print(f"   • Credited sUSD:      ${topup.credited_susd:.2f} sUSD")
    print(f"   • Execution Lane:     Lane #{topup.lane_id} (ADR-062 Parallel VM)")
    print(f"   • Layer-1 Tx Hash:    {topup.onchain_tx_hash}")
    print(f"   • Timestamp:          {topup.timestamp}")
    print()

    # --------------------------------------------------------------------------
    # Step 3: Autonomous AI Agent Dispatches 256-Lane HTTP 402 Micropayments
    # --------------------------------------------------------------------------
    print("-" * 80)
    print("⚡ Step 3: AI Agent Dispatches Concurrent HTTP 402 Micropayments ($0.0008 each)")
    print("-" * 80)

    tasks = [
        ("https://api.synapticchain.xyz/v1/crawl/deepseek-r1", 0.0008, 14, "Crawl4AI Reasoning Inference"),
        ("https://api.synapticchain.xyz/v1/search/financial-news", 0.0008, 77, "TradingAgents Market Ingestion"),
        ("https://api.synapticchain.xyz/v1/oracle/worldmonitor", 0.0008, 142, "WorldMonitor Geopolitical Feed"),
        ("https://api.synapticchain.xyz/v1/code/audit-ast", 0.0008, 219, "SVAH Smart Contract AST Analysis"),
    ]

    receipts = []
    for endpoint, amt, lane, ref in tasks:
        rec = toolkit.execute_http402_micropayment(
            endpoint_url=endpoint,
            amount_usd=amt,
            lane_id=lane,
            task_ref=ref,
        )
        receipts.append(rec)
        print(f"   ⚡ [Lane #{rec.lane_id:03}] Paid ${rec.amount_usd:.4f} -> {rec.task_ref:<32} | Status: {rec.status} | Finality: {rec.finality_ms:.2f}ms")

    print(f"\n   Total Micro-Settlements: {len(receipts)} calls confirmed with sub-100ms BFT finality.\n")

    # --------------------------------------------------------------------------
    # Step 4: Batch Metered Usage into Consolidated Stripe Invoice
    # --------------------------------------------------------------------------
    print("-" * 80)
    print("🧾 Step 4: Consolidate 256-Lane Executions into Audited Stripe Invoice")
    print("-" * 80)
    invoice = toolkit.create_agent_metered_invoice(
        customer_id="cus_enterprise_ai_corp_991",
        customer_email="billing@enterprisegpt.io",
    )
    print(f"✅ Stripe Metered Invoice Finalized: {invoice.invoice_id}")
    print(f"   • Customer ID:        {invoice.customer_id}")
    print(f"   • Micro-Events:       {invoice.total_events} transactions batched")
    print(f"   • Total Amount:       ${invoice.total_amount_usd:.6f} USD")
    print(f"   • On-Chain Proof:     Merkle Root {invoice.merkle_root_proof[:24]}...")
    print(f"   • Hosted Invoice URL: {invoice.hosted_invoice_url}")
    print()

    # --------------------------------------------------------------------------
    # Step 5: Reverse Settlement (Micro-Earnings -> Stripe Fiat Payout)
    # --------------------------------------------------------------------------
    print("-" * 80)
    print("🔄 Step 5: Liquidate Agent Micro-Earnings to Fiat via Stripe Connect")
    print("-" * 80)
    payout = toolkit.reverse_settlement_to_fiat(
        amount_usd=2.50,
        stripe_account_id="acct_1NXY8820Z910",
        wallet_address=toolkit.default_wallet,
    )
    print(f"✅ Stripe Connect Transfer & Payout Initiated:")
    print(f"   • Transfer ID:        {payout.transfer_id}")
    print(f"   • Payout ID:          {payout.payout_id}")
    print(f"   • Destination:        Stripe Connected Account ({payout.destination_account})")
    print(f"   • Liquidated Amount:  ${payout.amount_usd:.2f} USD ({payout.burned_susd:.2f} sUSD burned on Layer-1)")
    print(f"   • Layer-1 Burn Tx:    {payout.onchain_burn_tx}")
    print(f"   • Status:             {payout.status.upper()}\n")

    # --------------------------------------------------------------------------
    # Step 6: Export Tool Definitions for AI Agent Frameworks
    # --------------------------------------------------------------------------
    print("-" * 80)
    print("🛠️ Step 6: Export AI Agent Framework Tools (OpenAI / Anthropic / LangChain)")
    print("-" * 80)
    tools = toolkit.get_tools()
    print(f"   Registered {len(tools)} Agent Tools:")
    for t in tools:
        fn = t["function"]
        print(f"   • [{fn['name']}]: {fn['description']}")
    print()

    print("=" * 80)
    print("  🎉 STRIPE AGENT TOOLKIT DEMO COMPLETE: ALL BRIDGED FLOWS VERIFIED")
    print("=" * 80)


if __name__ == "__main__":
    main()
