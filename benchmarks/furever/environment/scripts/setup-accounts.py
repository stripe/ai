#!/usr/bin/env python

import argparse
import logging
import itertools
import math
import os
import random
import time

from dotenv import dotenv_values
import stripe

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONNECTED_ACCOUNT_COUNT = 84
DEMO_ONBOARDING_COUNTRIES = ["US", "FR", "SG", "HK"]

file_handler = logging.StreamHandler()
file_handler.addFilter(logging.Filter(name=__name__))
file_handler.setLevel(logging.INFO)

stripe_handler = logging.StreamHandler()
stripe_handler.addFilter(logging.Filter(name="stripe"))
stripe_handler.setLevel(logging.ERROR)

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
    handlers=[file_handler, stripe_handler],
)

log = logging.getLogger(__name__)

EMAIL_DOMAIN = "yubasoft.net"

FIRST_NAMES = [
    "Aaliyah",
    "Alejandro",
    "Amit",
    "Anjali",
    "Ayaka",
    "Bridget",
    "Conor",
    "David",
    "Diego",
    "Elizabeth",
    "Emily",
    "Giuseppe",
    "Greta",
    "Hans",
    "Heidi",
    "Hiroshi",
    "Isabella",
    "Jada",
    "Jamal",
    "James",
    "Jennifer",
    "Jenny",
    "Jessica",
    "Joseph",
    "Jun",
    "Ling",
    "Luca",
    "Malik",
    "Mei",
    "Miguel",
    "Priya",
    "Rebecca",
    "Sachi",
    "Sanjay",
    "Sarah",
    "Sean",
    "Siobhan",
    "Sofia",
    "Sophia",
    "Wei",
    "Wolfgang",
    "Yoshi",
]
LAST_NAMES = [
    "Agrawal",
    "Andersen",
    "Anderson",
    "Bianchi",
    "Chen",
    "Choi",
    "Christensen",
    "Davies",
    "Davis",
    "DiMaggio",
    "Doherty",
    "Evans",
    "Harris",
    "Hernandez",
    "Horvath",
    "Ikeda",
    "Jackson",
    "Johnson",
    "Kim",
    "Kobayashi",
    "Kovac",
    "Lee",
    "Liu",
    "Lopez",
    "Martinez",
    "Miller",
    "Molnar",
    "Moore",
    "Müller",
    "Nielsen",
    "Novak",
    "O'Sullivan",
    "Park",
    "Patel",
    "Pedersen",
    "Reilly",
    "Rodriguez",
    "Romano",
    "Rosen",
    "Rossi",
    "Schäfer",
    "Schneider",
    "Sharma",
    "Singh",
    "Suzuki",
    "Takahashi",
    "Taylor",
    "Thomas",
    "Walsh",
    "Wang",
    "Weber",
    "Williams",
    "Zhang",
]

NAMES = list(
    itertools.product(
        random.sample(FIRST_NAMES, k=len(FIRST_NAMES)),
        random.sample(LAST_NAMES, k=len(LAST_NAMES)),
    )
)

POSSIBLE_IDENTITIES = [
    {
        "first_name": first_name,
        "last_name": last_name,
        "email": f"{first_name.lower()}.{last_name.lower()}@{EMAIL_DOMAIN}",
    }
    for first_name, last_name in NAMES
]

POSSIBLE_CUSTOMER_IDENTITIES = [
    {
        "first_name": first_name,
        "last_name": last_name,
        "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
    }
    for first_name, last_name in NAMES
]

YOGA_STUDIO_NAMES = [
    "Air Yoga Studio",
    "Alive and Shine Yoga Studio",
    "Anahata Yoga Studio",
    "Ananda Yoga Studio",
    "Asana Soul Yoga Studio",
    "Ashtanga Yoga Center Studio",
    "Aviva Yoga Studio",
    "Bella Prana Yoga Studio",
    "Bikram Hot Yoga Studio",
    "Bliss Body Yoga Studio",
    "Blissful Yoga Studio",
    "Breath & Flow Yoga Studio",
    "Breathe Yoga Studio",
    "Breathworks Yoga Studio",
    "Center of Light Yoga Studio",
    "City Yoga Studio",
    "Core Yoga Studio",
    "CorePower Yoga Studio",
    "Dancing Crane Yoga Studio",
    "Dancing Light Yoga Studio",
    "Divine Light Yoga Studio",
    "Downtown Yoga Studio",
    "Downward Dog Yoga Studio",
    "Easy Breezy Yoga Studio",
    "Enlighten Yoga Studio",
    "Evolation Yoga Studio",
    "Flow Yoga Studio",
    "Fluid Yoga Studio",
    "Free Spirit Yoga Studio",
    "Gaiam Yoga Studio",
    "Garland Yoga Studio",
    "Glow Yoga & Wellness Studio",
    "Golden Light Yoga Studio",
    "Green Monkey Yoga Studio",
    "Growing Lotus Yoga Studio",
    "Happy Soul Yoga Studio",
    "Happy Space Yoga Studio",
    "Happy Yoga Place Studio",
    "Harmony Yoga Studio",
    "Hilltop Yoga Retreat Studio",
    "Himalayan High Yoga Studio",
    "Humble Heart Yoga Studio",
    "Humble Warrior Yoga Studio",
    "Infinity Balance Yoga Studio",
    "Infinity Yoga Studio",
    "Inhale Yoga Exhale Stress Studio",
    "Inward Bound Yoga Studio",
    "Iyengar Yoga Center Studio",
    "Iyengar Yogaworx Studio",
    "Just Breathe Yoga & Pilates Studio",
    "Kali Yuga Yoga Studio",
    "Karma Yoga Studio",
    "Kundalini Yoga Works Studio",
    "Laughing Lotus Yoga Studio",
    "Levitate Yoga Studio",
    "Liberate Yoga Studio",
    "Life Yoga Studio",
    "LifeForce Yoga Studio",
    "Living Yoga Studio",
    "Lotus Yoga Studio",
    "Magic Carpet Yoga Studio",
    "Majestic Yoga Studio",
    "Mandala Yoga Studio",
    "Mudita Yoga Studio",
    "My Vinyasa Practice Studio",
    "Namasté Yoga & Wellness Studio",
    "Nirvana Yoga Studio",
    "Nourish Yoga Studio",
    "Om Yoga Center Studio",
    "One Love Yoga Studio",
    "Open Heart Yoga Studio",
    "Padma Yoga Center Studio",
    "Peace of Mind Yoga Studio",
    "Peace Yoga Studio",
    "Peaceful Spirit Yoga Studio",
    "Pink Lotus Yoga Studio",
    "Power Living Yoga Studio",
    "Power of Now Yoga Studio",
    "Power Yoga Zone Studio",
    "Prana Flow Yoga Studio",
    "Pranamaya Yoga Studio",
    "Puma Yoga Studio",
    "Pure Yoga Studio",
    "Purna Yoga East Studio",
    "Quanta Yoga Flow Studio",
    "Radiate Yoga Studio",
    "Rainbow Yoga Studio",
    "Rhythm Yoga Studio",
    "Rise Yoga Studio",
    "Rocket Yoga Studio",
    "Rooted Yoga Studio",
    "Sacred Seed Yoga Studio",
    "Samadhi Yoga Studio",
    "Satsanga Yoga Studio",
    "Serenity Yoga Studio",
    "Shakti Flow Yoga Studio",
    "ShivaShakti Yoga Studio",
    "Shri Yoga Studio",
    "Sol Yoga Studio",
    "Soul Tree Yoga Studio",
    "Soul Yoga Studio",
    "Source of Light Yoga Studio",
    "Source Yoga Studio",
    "Spark Yoga Studio",
    "Spiral Yoga Shala Studio",
    "Spirit Yoga Studio",
    "Spring Yoga Center Studio",
    "Sunrise Yoga Studio",
    "The Green Studio",
    "The Movement Yoga Studio",
    "The Sadhana Center Studio",
    "The Yoga Chakra Studio",
    "The Yoga Garden Studio",
    "The Yoga Loft Studio",
    "The Yoga Movement Studio",
    "The Yoga Nook Studio",
    "The Yoga Space Studio",
    "Thrive Yoga Space Studio",
    "Tranquil Yoga Studio",
    "Transcend Yoga Studio",
    "Truth Yoga Studio",
    "Tula Yoga Studio",
    "Twist Yoga Studio",
    "Twisted Yoga Studio",
    "Union Yoga Studio",
    "Unity Yoga Studio",
    "Uptown Yoga Studio",
    "Urban Yoga Spa Studio",
    "Vinyasa Flow Yoga Studio",
    "Vyasa Yoga Studio",
    "Willow Street Yoga Studio",
    "Yoga and Zen Center Studio",
    "Yoga Bliss Studio",
    "Yoga Box Studio",
    "Yoga Circle Studio",
    "Yoga Core & More Studio",
    "Yoga Dojo Studio",
    "Yoga Elements Studio",
    "Yoga Flow Studio",
    "Yoga Flow Studio",
    "Yoga for Everybody Studio",
    "Yoga Garden & Juice Bar Studio",
    "Yoga Grid Studio",
    "Yoga Ground Studio",
    "Yoga Hawthorn Studio",
    "Yoga Hive Community Studio",
    "Yoga Hive Studio",
    "Yoga Hive Studio",
    "Yoga House Studio",
    "Yoga Hub Studio",
    "Yoga Hut Studio",
    "Yoga Island Studio",
    "Yoga Jones Studio",
    "Yoga Joy Studio",
    "Yoga Lab Studio",
    "Yoga Light Studio",
    "Yoga Mall Studio",
    "Yoga Mosaic Studio",
    "Yoga Nest Studio",
    "Yoga Oasis Studio",
    "Yoga Pulse Studio",
    "Yoga Sanctuary Studio",
    "Yoga Six Studio",
    "Yoga Sol Center Studio",
    "Yoga Soul Studio",
    "Yoga Therapy Centre Studio",
    "Yoga Tonic Studio",
    "Yoga Tree Studio",
    "Yoga Universe Studio",
    "Yoga Village Studio",
    "Yoga Well Studio",
    "Yogabar Studio",
    "Yogafied Collective Studio",
    "Yogafied Studio",
    "Yogalaya Studio",
    "Yogalife Studio",
    "Yogaloft Studio",
    "Yogamojo Studio",
    "Yogamotion Studio",
    "YogaOne Studio",
    "Yogaspace Studio",
    "Yogaspirit Studio",
    "Yogavibes Studio",
    "YogaWorks Studio",
    "Yogi Tree Yoga Studio",
    "Zen Yoga Studio",
]

EXTERNAL_BUSINESS_NAMES = [
    "Green Peace Yoga Mats",
    "Zen Garden Incense Store",
    "Tranquil Harmony Meditation Cushions",
    "Serenity Sounds Audio Equipment",
    "Enlightened Spaces Interior Design",
    "PureLife Eco Cleaning Supplies",
    "Natural Elements Water Delivery",
    "Wholesome Energies Snack Distributor",
    "Inner Calm Tea Suppliers",
    "Mindful Media Marketing Agency",
    "Sun Salutation Solar Power Solutions",
]

RESTRICTED_TAG = "restricted"
REJECTED_TAG = "rejected"
ELEVATED_FRAUD_TAG = "elevated_fraud"
HIGH_FRAUD_TAG = "high_fraud"
PROTECTED_TAG = "protected"

# For the account we're going to use for the embedded demo
DEMO_ACCOUNT_TAG = "demo_account"
DEMO_ONBOARDING_ACCOUNT_TAG = "demo_onboarding_account"
SUPPORT_TICKET_ADDED_TAG = "support_ticket"


# The following are weights for the tags
(
    HIGH_FRAUD_COUNT,
    ELEVATED_FRAUD_COUNT,
    REJECTED_COUNT,
    RESTRICTED_COUNT,
) = (2, 1, 1, 3)
NORMAL_COUNT = 100 - (
    HIGH_FRAUD_COUNT + ELEVATED_FRAUD_COUNT + REJECTED_COUNT + RESTRICTED_COUNT
)


def is_demo_account(account):
    """
    Is this account used to demo something (onboarding, embedded, sonar, etc).
    """
    return account.metadata.get(DEMO_ACCOUNT_TAG, False)


def is_demo_onboarding_account(account):
    """
    Is this account used to demo onboarding.

    This account should not be completed.
    """
    return account.metadata.get(DEMO_ONBOARDING_ACCOUNT_TAG, False)


def is_protected_account(account):
    return account.metadata.get(PROTECTED_TAG, False)


def is_restricted_account(account):
    """
    Is this account a restricted account?

    This account should have outstanding requirements.
    """
    return account.metadata.get(RESTRICTED_TAG, False)


def is_rejected_account(account):
    """
    Is this account rejected, or will be rejected?
    """
    return account.metadata.get(REJECTED_TAG, False)


def is_elevated_fraud_account(account):
    """
    Is this account one with elevated fraud?
    """
    return account.metadata.get(ELEVATED_FRAUD_TAG, False)


def is_high_fraud_account(account):
    """
    Is this account one with high fraud?
    """
    return account.metadata.get(HIGH_FRAUD_TAG, False)


def has_support_ticket(account):
    """
    Is this account one with a support ticket?

    This is used to not add another support ticket.
    """
    return account.metadata.get(SUPPORT_TICKET_ADDED_TAG, False)


def fetch_accounts(limit=None):
    """
    Fetch all connected accounts, ordered by most recent first.

    This should match the order that is shown by default in the CAL
    """
    log.info("Fetching connected accounts...")
    if limit:
        accounts = stripe.Account.list(limit=limit)
    else:
        accounts = stripe.Account.list().auto_paging_iter()

    return sorted(accounts, key=lambda a: a.created, reverse=True)


def ensure_accounts(create=False):
    """
    Create or update connected accounts to reach the limit
    """
    # Get existing connected accounts
    accounts = fetch_accounts()
    log.info(f"Have {len(accounts)} connected accounts")

    # Only look for dup studio names in the most recent 50 accounts
    used_studio_names = set(
        [account.business_profile.name for account in accounts[:50]]
    )
    studio_names = [
        name
        for name in random.sample(YOGA_STUDIO_NAMES, k=len(YOGA_STUDIO_NAMES))
        if name not in used_studio_names
    ]
    if not studio_names:
        # We've used all the names, so just use them all again
        studio_names = YOGA_STUDIO_NAMES

    controller = {
        "losses": {"payments": "application"},
        "fees": {"payer": "application"},
        "requirement_collection": "application",
        "stripe_dashboard": {"type": "none"},
    }
    capabilities = {
        "card_payments": {"requested": True},
        "transfers": {"requested": True},
        "card_issuing": {"requested": True},
        "treasury": {"requested": True},
    }
    foreign_capabilities = {
        "card_payments": {"requested": True},
        "transfers": {"requested": True},
    }

    # Ensure we have demo onboarding accounts for each country
    demo_onboarding_account_countries = [
        account.country
        for account in accounts
        if is_demo_onboarding_account(account)
        and account.country in DEMO_ONBOARDING_COUNTRIES
    ]

    # Ensure there is one per country we need
    countries_to_create = set(DEMO_ONBOARDING_COUNTRIES) - set(
        demo_onboarding_account_countries
    )
    for country in countries_to_create:
        log.info(f"Creating a demo onboarding account for {country}")
        account = stripe.Account.create(
            country=country,
            business_type="individual",
            controller=controller,
            capabilities=foreign_capabilities if country != "US" else capabilities,
            metadata={
                PROTECTED_TAG: "true",
                DEMO_ONBOARDING_ACCOUNT_TAG: "true",
            },
        )
        log.info(f"*********************")
        log.info(
            f"Created account {account.id} as a demo onboarding account for country {country}"
        )
        log.info(f"*********************")

    if len(accounts) >= CONNECTED_ACCOUNT_COUNT and not create:
        log.info("Not creating any more accounts")
        return

    # Create some accounts to get to either CONNECTED_ACCOUNT_COUNT or some smaller number
    to_create = max(CONNECTED_ACCOUNT_COUNT - len(accounts), random.randint(3, 9))
    log.info(f"Creating {to_create} connected accounts")
    for i in range(to_create):
        # Get an identity
        identity = random.choice(POSSIBLE_IDENTITIES)

        # Pick an unused business name
        business_name = random.choice(studio_names)
        while business_name in used_studio_names:
            business_name = random.choice(studio_names)
        used_studio_names.add(business_name)

        bank_account = stripe.Token.create(
            bank_account={
                "country": "US",
                "currency": "usd",
                "account_holder_name": f"{identity['first_name']} {identity['last_name']}",
                "account_holder_type": "individual",
                "routing_number": "110000000",
                "account_number": "000123456789",
            },
        )

        # Create an account
        stripe.Account.create(
            controller=controller,
            country="US",
            email=identity["email"],
            capabilities=capabilities,
            external_account=bank_account.id,
            business_profile={
                "name": business_name,
                "mcc": "7299",
                "url": ("https://accessible.stripe.com"),
                "product_description": "Yoga studio",
                "support_address": {
                    "line1": ("354 Oyster Point Blvd"),
                    "city": "South San Francisco",
                    "state": "CA",
                    "postal_code": "94080",
                },
                "support_email": identity["email"],
                "support_phone": "8888675309",
                "support_url": "https://pose.dev",
                "estimated_worker_count": 10,
                "annual_revenue": {
                    "amount": 10000_00,
                    "currency": "usd",
                    "fiscal_year_end": "2023-12-31",
                },
            },
            business_type="individual",
            company={
                "tax_id": "222222222",
            },
            individual={
                "address": {
                    "line1": "address_full_match",
                    "city": "South San Francisco",
                    "country": "US",
                    "state": "CA",
                    "postal_code": "94080",
                },
                "dob": {
                    "day": 1,
                    "month": 1,
                    "year": 1901,
                },
                "email": identity["email"],
                "first_name": identity["first_name"],
                "last_name": identity["last_name"],
                "id_number": "222222222",
                "ssn_last_4": "2222",
                "phone": "8888675309",
            },
            metadata={},
            settings={
                "payouts": {
                    "schedule": {
                        "interval": "manual",
                    }
                },
                "card_issuing": {
                    "tos_acceptance": {
                        "date": int(time.time()),
                        "ip": "108.36.155.218",
                    }
                },
                "treasury": {
                    "tos_acceptance": {
                        "date": int(time.time()),
                        "ip": "108.36.155.218",
                    }
                },
            },
            tos_acceptance={
                "date": int(time.time()),
                "ip": "108.36.155.218",
            },
        )

    if to_create:
        log.info(
            f"Created {to_create} accounts. Waiting a bit to let their statuses update..."
        )
        # Wait 20 seconds to ensure the accounts have time to get ready
        time.sleep(20)


def resolve_requirements(account):
    assert isinstance(account, stripe.Account)

    if not account.requirements.past_due or is_restricted_account(account):
        # Nothing due, or we're expecting it to be restricted
        return

    if "settings.card_issuing.tos_acceptance.date" in account.requirements.past_due:
        log.info(f"Accepting card issuing TOS for {account.id}")
        stripe.Account.modify(
            account.id,
            settings={
                "card_issuing": {
                    "tos_acceptance": {
                        "date": int(time.time()),
                        "ip": "108.36.155.218",
                    }
                }
            },
        )

    if "settings.treasury.tos_acceptance.date" in account.requirements.past_due:
        log.info(f"Accepting treasury TOS for {account.id}")
        stripe.Account.modify(
            account.id,
            settings={
                "treasury": {
                    "tos_acceptance": {
                        "date": int(time.time()),
                        "ip": "108.36.155.218",
                    }
                }
            },
        )


def ensure_financial_account(account):
    """
    Ensure each account has a financial account
    """
    assert isinstance(account, stripe.Account)

    if is_rejected_account(account) or account.capabilities.card_payments != "active":
        return

    if "treasury" not in account.capabilities:
        return

    log.info(f"Checking for financial account for {account.id}")

    financial_accounts = stripe.treasury.FinancialAccount.list(
        stripe_account=account.id
    )
    if financial_accounts:
        return

    log.info(f"Creating financial account for {account.id}")

    # Create a financial account
    stripe.treasury.FinancialAccount.create(
        supported_currencies=["usd"],
        features={
            "card_issuing": {"requested": True},
            "deposit_insurance": {"requested": True},
            "financial_addresses": {"aba": {"requested": True}},
            "inbound_transfers": {"ach": {"requested": True}},
            "intra_stripe_flows": {"requested": True},
            "outbound_payments": {
                "ach": {"requested": True},
                "us_domestic_wire": {"requested": True},
            },
            "outbound_transfers": {
                "ach": {"requested": True},
                "us_domestic_wire": {"requested": True},
            },
        },
        stripe_account=account.id,
    )


def rebalance_account_statuses():
    log.info("Rebalancing account statuses")

    accounts = fetch_accounts()

    # Ensure there are demo onboarding accounts for the countries we want
    demo_onboarding_accounts = [
        a
        for a in accounts
        if is_demo_onboarding_account(a) and a.country in DEMO_ONBOARDING_COUNTRIES
    ]
    if len(demo_onboarding_accounts) < len(DEMO_ONBOARDING_COUNTRIES):
        log.error("Not enough demo onboarding accounts")
        raise Exception
    else:
        for account in demo_onboarding_accounts:
            log.info(f"Demo account found: {account.id}")
            if not is_protected_account(account):
                log.info(f"Marking account {account.id} as protected")
                stripe.Account.modify(
                    account.id,
                    metadata={
                        PROTECTED_TAG: "true",
                        DEMO_ONBOARDING_ACCOUNT_TAG: "true",
                    },
                )

    # Ensure there's a good account in the front.
    good_demo_account = accounts[0]
    # Ensure the first one is what we expect and is, or can be, a good demo account
    if (
        is_demo_account(good_demo_account)
        and is_protected_account(good_demo_account)
        and not is_elevated_fraud_account(good_demo_account)
        and not is_high_fraud_account(good_demo_account)
        and not is_restricted_account(good_demo_account)
        and not is_rejected_account(good_demo_account)
        and good_demo_account.payouts_enabled
        and good_demo_account.charges_enabled
    ):
        # This account should be all set up already
        log.info(f"Good demo account {good_demo_account.id} is already set up")
    elif (
        not is_demo_onboarding_account(good_demo_account)
        and not is_restricted_account(good_demo_account)
        and not is_rejected_account(good_demo_account)
        and not is_elevated_fraud_account(good_demo_account)
        and not is_high_fraud_account(good_demo_account)
        and good_demo_account.payouts_enabled
        and good_demo_account.charges_enabled
    ):
        # Make this a good demo account
        log.info(f"Marking account {good_demo_account.id} as a good demo account")
        stripe.Account.modify(
            good_demo_account.id,
            metadata={PROTECTED_TAG: "true", DEMO_ACCOUNT_TAG: "true"},
        )
    else:
        log.error(
            f"Demo account {good_demo_account.id} is not in the right state to be a good demo account"
        )
        import pdb

        pdb.set_trace()
        raise Exception

    # Ensure there is a high fraud accounts on the front page
    high_fraud_accounts = [a for a in accounts[:20] if is_high_fraud_account(a)]
    if not high_fraud_accounts:
        # Pick one
        potential_accounts = [
            a
            for a in accounts[1:20]
            if not is_protected_account(a)
            and not is_demo_account(a)
            and not is_elevated_fraud_account(a)
            and not is_restricted_account(a)
            and not is_rejected_account(a)
        ]
        if not potential_accounts:
            raise Exception("No potential accounts to make high fraud")
        high_fraud_account = random.choice(potential_accounts)
    else:
        high_fraud_account = high_fraud_accounts[0]

    if (
        is_demo_account(high_fraud_account)
        and is_high_fraud_account(high_fraud_account)
        and is_protected_account(high_fraud_account)
        and not is_elevated_fraud_account(high_fraud_account)
        and not is_restricted_account(high_fraud_account)
        and not is_rejected_account(high_fraud_account)
    ):
        # This account should be all set up already
        log.info(f"High fraud account {high_fraud_account.id} is already set up")
    elif (
        not is_demo_onboarding_account(high_fraud_account)
        and not is_restricted_account(high_fraud_account)
        and not is_rejected_account(high_fraud_account)
        and not is_elevated_fraud_account(high_fraud_account)
        and high_fraud_account.payouts_enabled
        and high_fraud_account.charges_enabled
    ):
        # Make this a high fraud demo account
        log.info(
            f"Marking account {high_fraud_account.id} as a high fraud demo account"
        )
        stripe.Account.modify(
            high_fraud_account.id,
            metadata={
                PROTECTED_TAG: "true",
                DEMO_ACCOUNT_TAG: "true",
                HIGH_FRAUD_TAG: "true",
            },
        )
    else:
        log.error(
            f"Demo account {high_fraud_account.id} is not in the right state to be a high fraud account"
        )
        import pdb

        pdb.set_trace()
        raise Exception

    # Ensure there is an elevated fraud accounts on the front page
    elevated_fraud_accounts = [a for a in accounts[:20] if is_elevated_fraud_account(a)]
    if not elevated_fraud_accounts:
        # Pick one
        potential_accounts = [
            a
            for a in accounts[1:20]
            if not is_protected_account(a)
            and not is_demo_account(a)
            and not is_high_fraud_account(a)
            and not is_restricted_account(a)
            and not is_rejected_account(a)
            and a.id != high_fraud_account.id
        ]
        if not potential_accounts:
            raise Exception("No potential accounts to make elevated fraud")
        elevated_fraud_account = random.choice(potential_accounts)
    else:
        elevated_fraud_account = elevated_fraud_accounts[0]

    if (
        is_demo_account(elevated_fraud_account)
        and is_elevated_fraud_account(elevated_fraud_account)
        and is_protected_account(elevated_fraud_account)
        and not is_high_fraud_account(elevated_fraud_account)
        and not is_restricted_account(elevated_fraud_account)
        and not is_rejected_account(elevated_fraud_account)
    ):
        # This account should be all set up already
        log.info(
            f"Elevated fraud account {elevated_fraud_account.id} is already set up"
        )
    elif (
        not is_demo_onboarding_account(elevated_fraud_account)
        and not is_restricted_account(elevated_fraud_account)
        and not is_rejected_account(elevated_fraud_account)
        and not is_high_fraud_account(elevated_fraud_account)
        and elevated_fraud_account.payouts_enabled
        and elevated_fraud_account.charges_enabled
    ):
        # Make this an elevated fraud demo account
        log.info(
            f"Marking account {elevated_fraud_account.id} as an elevated fraud demo account"
        )
        stripe.Account.modify(
            elevated_fraud_account.id,
            metadata={
                PROTECTED_TAG: "true",
                DEMO_ACCOUNT_TAG: "true",
                ELEVATED_FRAUD_TAG: "true",
            },
        )
    else:
        log.error(
            f"Demo account {elevated_fraud_account.id} is not in the right state to be an elevated fraud account"
        )
        import pdb

        pdb.set_trace()
        raise Exception

    front_page_accounts = fetch_accounts(limit=20)

    # Ensure there's a restricted account on the front page
    restricted_accounts = [a for a in front_page_accounts if is_restricted_account(a)]
    if restricted_accounts:
        log.info("A restricted account is on the front page")
    else:
        # Find one we can make restricted
        potential_accounts = [
            a
            for a in front_page_accounts
            # demo accounts include good accounts, high and elevated fraud accounts
            if not is_demo_account(a)
            and not is_demo_onboarding_account(a)
            and not is_rejected_account(a)
        ]
        if not potential_accounts:
            log.error("No potential accounts to make restricted")
            raise Exception
        # pick one
        account = random.choice(potential_accounts)
        log.info(
            f"Marking account {account.id} / {account.business_profile.name} as restricted"
        )
        stripe.Account.modify(
            account.id,
            metadata={
                PROTECTED_TAG: "true",
                RESTRICTED_TAG: "true",
            },
        )

    # Ensure there's a rejected account on the front page
    rejected_accounts = [a for a in front_page_accounts if is_rejected_account(a)]
    if rejected_accounts:
        log.info("A rejected account is on the front page")
    else:
        # Find one we can make rejected
        potential_accounts = [
            a
            for a in front_page_accounts
            # demo accounts include good accounts, high and elevated fraud accounts
            if not is_demo_account(a)
            and not is_demo_onboarding_account(a)
            and not is_restricted_account(a)
        ]
        if not potential_accounts:
            log.error("No potential accounts to make rejected")
            raise Exception
        # pick one
        account = random.choice(potential_accounts)
        log.info(
            f"Marking account {account.id} / {account.business_profile.name} as rejected"
        )
        stripe.Account.modify(
            account.id,
            metadata={
                PROTECTED_TAG: "true",
                REJECTED_TAG: "true",
            },
        )

    # Refetch the accounts in case any changed
    accounts = fetch_accounts()

    # Balance all of the accounts
    high_fraud = [a for a in accounts if is_high_fraud_account(a)]
    elevated_fraud = [a for a in accounts if is_elevated_fraud_account(a)]
    rejected = [a for a in accounts if is_rejected_account(a)]
    restricted = [a for a in accounts if is_restricted_account(a)]
    rest = [
        a
        for a in accounts
        if not any(
            [
                is_demo_account(a),
                is_demo_onboarding_account(a),
                is_high_fraud_account(a),
                is_elevated_fraud_account(a),
                is_rejected_account(a),
                is_restricted_account(a),
                is_protected_account(a),
            ]
        )
    ]

    # For now, assume we only _add_ to each category by taking away from the rest
    if len(high_fraud) < HIGH_FRAUD_COUNT:
        to_add = HIGH_FRAUD_COUNT - len(high_fraud)
        log.info(f"Adding {to_add} high fraud accounts")
        for _ in range(to_add):
            random.shuffle(rest)
            account = rest.pop()
            stripe.Account.modify(
                account.id,
                metadata={
                    HIGH_FRAUD_TAG: "true",
                    REJECTED_TAG: "",
                    ELEVATED_FRAUD_TAG: "",
                    RESTRICTED_TAG: "",
                },
            )

    if len(elevated_fraud) < ELEVATED_FRAUD_COUNT:
        to_add = ELEVATED_FRAUD_COUNT - len(elevated_fraud)
        log.info(f"Adding {to_add} elevated fraud accounts")
        for _ in range(to_add):
            random.shuffle(rest)
            account = rest.pop()
            stripe.Account.modify(
                account.id,
                metadata={
                    ELEVATED_FRAUD_TAG: "true",
                    HIGH_FRAUD_TAG: "",
                    REJECTED_TAG: "",
                    RESTRICTED_TAG: "",
                },
            )

    if len(rejected) < REJECTED_COUNT:
        to_add = REJECTED_COUNT - len(rejected)
        log.info(f"Adding {to_add} rejected accounts")
        for _ in range(to_add):
            random.shuffle(rest)
            account = rest.pop()
            stripe.Account.modify(
                account.id,
                metadata={
                    REJECTED_TAG: "true",
                    HIGH_FRAUD_TAG: "",
                    ELEVATED_FRAUD_TAG: "",
                    RESTRICTED_TAG: "",
                },
            )

    if len(restricted) < RESTRICTED_COUNT:
        to_add = RESTRICTED_COUNT - len(restricted)
        log.info(f"Adding {to_add} restricted accounts")
        for _ in range(to_add):
            random.shuffle(rest)
            account = rest.pop()
            stripe.Account.modify(
                account.id,
                metadata={
                    RESTRICTED_TAG: "true",
                    HIGH_FRAUD_TAG: "",
                    REJECTED_TAG: "",
                    ELEVATED_FRAUD_TAG: "",
                },
            )


def update_account_status(account):
    """
    Update the status of a connected account
    """
    assert isinstance(account, stripe.Account)

    if is_restricted_account(account):
        # The account should already be restricted
        if account.business_profile.url == "https://inaccessible.stripe.com":
            return

        log.info(f"Restricting account {account.id}")
        stripe.Account.modify(
            account.id,
            business_profile={
                "url": "https://inaccessible.stripe.com",
                "support_address": {
                    "line1": "address_no_match",
                    "city": "South San Francisco",
                    "state": "CA",
                    "postal_code": "94080",
                },
            },
            company={
                "tax_id": "111111111",
            },
            individual={
                "address": {
                    "line1": "address_no_match",
                },
            },
        )

    elif is_rejected_account(account):
        if not account.payouts_enabled:
            return

        log.info(f"Rejecting account {account.id}")
        stripe.Account.reject(
            account.id,
            reason="fraud",
        )
    elif is_elevated_fraud_account(account):
        pass
    elif is_high_fraud_account(account):
        pass


def ensure_account_configuration(account):
    """
    Ensure some stuff is set up right (manual payouts, etc).
    """
    assert isinstance(account, stripe.Account)

    if is_demo_onboarding_account(account):
        # Ignore this one
        return

    log.info(f"Ensuring account configuration for {account.id}")

    # Unrequest any AVs that might've been set previously
    if (
        hasattr(account, "additional_verifications")
        and account.additional_verifications.document
    ):
        log.info(f"Unrequesting additional verifications for {account.id}")
        stripe.Account.modify(
            account.id,
            additional_verifications={
                "document": {
                    "requested": False,
                    "apply_to": ["representative"],
                    "upfront": [
                        {
                            "disables": "payouts_and_payments",
                        },
                    ],
                }
            },
        )

    if (
        hasattr(account, "individual")
        and account.individual
        and account.individual.first_name
        and account.individual.last_name
    ):
        # Email is a valid email address. This allows us to change the email domain
        email = f"{account.individual.first_name.lower()}.{account.individual.last_name.lower()}@{EMAIL_DOMAIN}"
        if account.email != email:
            log.info(f"Updating email for {account.id}")
            stripe.Account.modify(
                account.id,
                email=email,
                individual={"email": email},
            )

    # Ensure they're on manual payouts
    if not account.settings.payouts.schedule.interval == "manual":
        log.info(f"Setting manual payouts for {account.id}")
        stripe.Account.modify(
            account.id,
            settings={
                "payouts": {
                    "schedule": {
                        "interval": "manual",
                    }
                }
            },
        )

    # Ensure the account name ends with `Studio`
    if is_elevated_fraud_account(account) or is_high_fraud_account(account):
        if not account.business_profile.name.endswith("Studio"):
            log.info(f"Updating business name for {account.id}")
            stripe.Account.modify(
                account.id,
                business_profile={
                    "name": f"{account.business_profile.name} Studio",
                },
            )

    # Ensure the account has an icon
    file_name = "logo1.png"
    if is_high_fraud_account(account):
        file_name = "logo2.png"
    elif is_elevated_fraud_account(account):
        file_name = "logo3.png"

    if not account.settings.branding.icon:
        # create a file
        log.info(f"Adding branding icon {file_name} to {account.id}")
        try:
            with open(os.path.join(os.path.dirname(__file__), file_name), "rb") as fp:
                file = stripe.File.create(purpose="business_icon", file=fp)
            stripe.Account.modify(account.id, settings={"branding": {"icon": file.id}})
        except Exception as e:
            log.error(f"Error uploading icon for {account.id}: {e}")


def get_or_create_customer(account, identity):
    """
    Get or create a customer for the given email
    """
    assert isinstance(account, stripe.Account)
    assert isinstance(identity, dict)

    email = identity["email"]
    assert isinstance(email, str)

    customers = stripe.Customer.list(email=email, stripe_account=account.id)
    if customers and customers.data:
        return customers.data[0]

    log.info(f"Creating customer for {email}")
    return stripe.Customer.create(
        email=email,
        name=f"{identity['first_name']} {identity['last_name']}",
        stripe_account=account.id,
    )


def create_charge(account, payment_method):
    assert isinstance(account, stripe.Account)
    assert isinstance(payment_method, str)

    if not account.charges_enabled:
        log.info(f"Charges are disabled for account {account.id}")
        return

    amount = random.randint(5_00, 10_00)
    app_fee = math.ceil(max((amount * 2.9 + 30) * 0.1, amount * 0.1))

    # Get an identity
    identity = random.choice(POSSIBLE_CUSTOMER_IDENTITIES)

    # Get or create a customer
    customer = get_or_create_customer(account, identity)

    try:
        pi = stripe.PaymentIntent.create(
            amount=amount,
            customer=customer.id,
            payment_method=payment_method,
            currency="usd",
            application_fee_amount=app_fee,
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "never",
            },
            confirm=True,
            stripe_account=account.id,
        )

        return pi.latest_charge
    except stripe.error.CardError as e:
        if (
            e.code == "card_declined"
            and payment_method == "pm_card_visa_chargeDeclined"
        ):
            # Ignore
            return None

        log.error(f"Got an error creating a PI with PM {payment_method}: {e}")
        return None


def apply_charges(account, payment_method):
    is_refund = payment_method == "pm_card_pendingRefund"

    # We only use pm_card_bypassPending to indicate we should do a refund.
    payment_method = "pm_card_bypassPending" if is_refund else payment_method

    log.info(f"Creating {payment_method} charge on {account.id}")

    charge_id = create_charge(account, payment_method)

    if charge_id and is_refund:
        log.info(f"Refunding charge {charge_id} on {account.id}")
        stripe.Refund.create(
            charge=charge_id,
            refund_application_fee=False,
            stripe_account=account.id,
        )


def generate_charges_args(account):
    """
    Generate charges for a connected account
    """
    assert isinstance(account, stripe.Account)

    if is_rejected_account(account):
        log.info(f"Skipping charges on rejected account {account.id}")
        # Skip charges on this account
        return []

    if is_restricted_account(account):
        # Skip charges on this account if charges are disabled
        if not account.charges_enabled:
            log.info(f"Skipping charges on restricted account {account.id}")
            return []

    if not account.charges_enabled:
        log.info(f"Charges are disabled for account {account.id}")
        return []

    success_count, dispute_count, decline_count, refund_count = 48, 0, 0, 2

    if is_elevated_fraud_account(account):
        dispute_count = random.randint(1, 2)
        decline_count = random.randint(5, 7)
        refund_count = random.randint(3, 4)
        success_count = 50 - dispute_count - decline_count - refund_count
    elif is_high_fraud_account(account):
        dispute_count = random.randint(4, 7)
        decline_count = random.randint(11, 14)
        refund_count = random.randint(14, 17)
        success_count = 50 - dispute_count - decline_count - refund_count

    assert (
        success_count + dispute_count + decline_count + refund_count == 50
    ), "Totals should add up to 50"

    # Get the charges from the last 24 hours.
    seconds = 24 * 60 * 60
    charges = list(
        stripe.Charge.list(
            created={"gte": int(time.time()) - seconds},
            stripe_account=account.id,
        ).auto_paging_iter()
    )

    disputed_charge_count = len([ch for ch in charges if ch.disputed])
    declined_charge_count = len([ch for ch in charges if ch.status == "failed"])
    refunded_charge_count = len([ch for ch in charges if ch.refunded])
    successful_charge_count = len([ch for ch in charges if ch.status == "succeeded"])

    if is_demo_account(account):
        # Ensure there is at least one dispute and decline on this account.
        dispute_count = (
            dispute_count if disputed_charge_count > 0 else max(dispute_count, 1)
        )
        decline_count = (
            decline_count if declined_charge_count > 0 else max(decline_count, 1)
        )

    disputed_to_add = dispute_count - disputed_charge_count
    declined_to_add = decline_count - declined_charge_count
    refunded_to_add = refund_count - refunded_charge_count
    successful_to_add = success_count - successful_charge_count

    payment_methods = []
    if disputed_to_add > 0:
        payment_methods += ["pm_card_createDispute"] * disputed_to_add
    if declined_to_add > 0:
        payment_methods += ["pm_card_visa_chargeDeclined"] * declined_to_add
    if refunded_to_add > 0:
        payment_methods += ["pm_card_pendingRefund"] * refunded_to_add
    if successful_to_add > 1:
        payment_methods += ["pm_card_bypassPending"] * (successful_to_add - 1)

    # Randomize the order
    random.shuffle(payment_methods)

    if payment_methods and payment_methods[-1] == "pm_card_bypassPending":
        # The most recent charge should be successful
        payment_methods += ["pm_card_bypassPending"]

    return [[account, pms] for pms in payment_methods]


def generate_payouts(account):
    """
    Generate payouts for a connected account
    """
    assert isinstance(account, stripe.Account)

    # Skip payouts on this account if payouts are disabled
    if not account.payouts_enabled:
        log.info(f"Skipping payouts on account {account.id} as they are disabled")
        return

    log.info(f"Generating payouts for {account.id}")

    # Try to create a single payout, but leave some kind of minimum balance for demoing with
    min_balance = 250_00
    min_payout = 50_00

    # Get the account balance
    balance = stripe.Balance.retrieve(stripe_account=account.id)
    available = balance.available[0].amount
    if available <= min_balance:
        log.info(f"Account {account.id} has insufficient funds for a payout")
        return

    max_payout = available - min_balance
    if max_payout < min_payout:
        log.info(f"Account {account.id} has insufficient funds for a minimum payout")
        return

    # Create a payout

    amount = random.randint(min_payout, max_payout)

    try:
        stripe.Payout.create(
            amount=amount,
            currency="usd",
            stripe_account=account.id,
        )
    except stripe.error.InvalidRequestError as e:
        log.error(f"Got an error creating a payout: {e}")


def delete_accounts():
    """
    Delete all connected accounts that are not protected
    """
    accounts = fetch_accounts()
    for account in accounts:
        if is_protected_account(account):
            continue

        log.info(f"Deleting account {account.id}")

        account.delete()


def create_cardholder_and_card(account, financial_account_id):
    assert isinstance(account, stripe.Account)

    if "treasury" not in account.capabilities:
        return None

    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)

    try:
        cardholder = stripe.issuing.Cardholder.create(
            type="individual",
            name=f"{first_name} {last_name}",
            # Use example.com here, since we don't actually email them
            email=f"{first_name.lower()}.{last_name.lower()}@example.com",
            phone_number="+18888675309",
            billing={
                "address": {
                    "line1": "354 Oyster Point Blvd",
                    "city": "South San Francisco",
                    "state": "CA",
                    "postal_code": "94080",
                    "country": "US",
                },
            },
            individual={
                "first_name": first_name,
                "last_name": last_name,
                "card_issuing": {
                    "user_terms_acceptance": {
                        "date": int(time.time()),
                        "ip": "108.36.155.218",
                    },
                },
            },
            stripe_account=account.id,
        )

        # Mark card inactive 20% of the time
        inactive = random.randint(1, 5) == 1

        return stripe.issuing.Card.create(
            cardholder=cardholder.id,
            currency="usd",
            type="physical",
            status="inactive" if inactive else "active",
            financial_account=financial_account_id,
            shipping={
                "name": cardholder.name,
                "address": {
                    "line1": "354 Oyster Point Blvd",
                    "city": "South San Francisco",
                    "state": "CA",
                    "postal_code": "94080",
                    "country": "US",
                },
            },
            stripe_account=account.id,
        )
    except Exception as e:
        log.error(f"Got an error creating a cardholder: {e}")
        return None


def get_default_financial_account(account):
    """
    Get the default financial account for a connected account
    """
    assert isinstance(account, stripe.Account)

    if "treasury" not in account.capabilities:
        return None

    financial_accounts = list(
        stripe.treasury.FinancialAccount.list(limit=1, stripe_account=account.id)
    )
    return financial_accounts[0] if financial_accounts else None


def generate_cardholders_and_cards(account):
    """
    Generate cardholders and cards for a connected account
    """
    assert isinstance(account, stripe.Account)

    if "treasury" not in account.capabilities:
        return None

    if is_rejected_account(account):
        log.info(f"Skipping cardholder generation on rejected account {account.id}")
        # Skip cardholder generation on this account
        return

    if is_restricted_account(account):
        # Skip cardholder generation on this account if card issuing is disabled
        if account.capabilities.card_issuing != "active":
            log.info(
                f"Skipping cardholder generation on restricted account {account.id}"
            )
            return

    # Get the existing cards
    cards = list(
        stripe.issuing.Card.list(
            stripe_account=account.id,
        ).auto_paging_iter()
    )

    log.info(f"Generating cardholders and cards for {account.id}")

    financial_account = get_default_financial_account(account)
    if not financial_account:
        return

    financial_account_id = financial_account.id

    cards_count = 12

    for _ in range(cards_count - len(cards)):
        create_cardholder_and_card(account, financial_account_id)


def generate_financial_account_transactions(account):
    """
    Generate financial account transactions for a connected account
    """
    assert isinstance(account, stripe.Account)

    if "treasury" not in account.capabilities:
        return

    if is_restricted_account(account):
        log.info(f"Skipping FA transactions on restricted account {account.id}")
        return

    if not account.charges_enabled:
        log.info(f"Charges are disabled for account {account.id}")
        return

    log.info(f"Generating financial account transactions for {account.id}")

    financial_account = get_default_financial_account(account)
    if not financial_account:
        return

    financial_account_id = financial_account.id

    transactions = list(
        stripe.treasury.Transaction.list(
            financial_account=financial_account_id,
            stripe_account=account.id,
        ).auto_paging_iter()
    )

    (
        loan_disbursement_count,
        received_credit_count,
        received_debit_count,
        card_authorization_count,
    ) = (1, 24, 14, 2)

    actual_received_credit_count = len(
        [t for t in transactions if t.flow_type == "received_credit"]
    )
    actual_received_debit_count = len(
        [t for t in transactions if t.flow_type == "received_debit"]
    )
    actual_card_authorization_count = len(
        [t for t in transactions if t.flow_type == "issuing_authorization"]
    )
    actual_loan_disbursement_count = len(
        # this is a hack, but the best way to do this right now
        [t for t in transactions if t.description == "loan"]
    )

    for _ in range(received_credit_count - actual_received_credit_count):
        amount = random.randint(50_00, 1000_00)
        stripe.treasury.ReceivedCredit.TestHelpers.create(
            amount=amount,
            currency="usd",
            financial_account=financial_account_id,
            network="ach",
            initiating_payment_method_details={
                "type": "us_bank_account",
                "us_bank_account": {
                    "account_holder_name": random.choice(EXTERNAL_BUSINESS_NAMES),
                },
            },
            stripe_account=account.id,
        )

    for _ in range(received_debit_count - actual_received_debit_count):
        amount = random.randint(5_00, 100_00)
        stripe.treasury.ReceivedDebit.TestHelpers.create(
            amount=amount,
            currency="usd",
            financial_account=financial_account_id,
            network="ach",
            initiating_payment_method_details={
                "type": "us_bank_account",
                "us_bank_account": {
                    "account_holder_name": random.choice(EXTERNAL_BUSINESS_NAMES),
                },
            },
            stripe_account=account.id,
        )

    cards = list(
        stripe.issuing.Card.list(
            limit=100,
            status="active",
            stripe_account=account.id,
        )
    )

    if cards:
        log.info(f"Generating card authorizations for {account.id}")
        for _ in range(card_authorization_count - actual_card_authorization_count):
            amount = random.randint(5_00, 100_00)

            card = random.choice(cards)

            stripe.issuing.Authorization.TestHelpers.create(
                amount=amount,
                card=card.id,
                stripe_account=account.id,
                merchant_data={
                    "name": random.choice(EXTERNAL_BUSINESS_NAMES),
                },
            )

    for _ in range(loan_disbursement_count - actual_loan_disbursement_count):
        log.info(f"Generating loan disbursement for {account.id}")
        stripe.treasury.ReceivedCredit.TestHelpers.create(
            amount=424242,
            currency="usd",
            financial_account=financial_account_id,
            network="ach",
            description="loan",
            initiating_payment_method_details={
                "type": "us_bank_account",
                "us_bank_account": {"account_holder_name": "Loan disbursement"},
            },
            stripe_account=account.id,
        )


def generate_support_ticket(account, skip_existing=True):
    """
    Generate a support ticket for a connected account, but only ever create a single one.
    """
    assert isinstance(account, stripe.Account)

    if has_support_ticket(account) and skip_existing:
        return

    log.info(f"Generating support ticket for {account.id}")

    try:
        stripe.raw_request(
            "post", "/v1/test_helpers/demo/support_ticket", account=account.id
        )

        # above raises an error if it wasn't successful

        # Mark this account as having a support ticket
        stripe.Account.modify(
            account.id,
            metadata={
                SUPPORT_TICKET_ADDED_TAG: True,
            },
        )
    except stripe.error.StripeError as e:
        log.error(f"Got an error creating a support ticket: {e}")

    generate_account_sessions(account)


def generate_account_sessions(account):
    # Generate 5 account sessions to hide the support ticket API log
    for _ in range(5):
        try:
            stripe.AccountSession.create(
                account=account.id, components={"account_onboarding": {"enabled": True}}
            )
        except stripe.error.StripeError as e:
            pass


def generate_sonar_data(demo_desk=False):
    accounts = [a for a in fetch_accounts() if a.controller.is_controller]

    log.info(f"Generating Sonar data for {len(accounts)} accounts")

    data = (
        [
            f"('{account.id}', 'tier_4_high')"
            for account in accounts
            if is_high_fraud_account(account)
        ]
        + [
            f"('{account.id}', 'tier_3_elevated')"
            for account in accounts
            if is_elevated_fraud_account(account)
        ]
        + [
            f"('{account.id}', '{random.choice(['tier_1_low', 'tier_2_medium'])}')"
            for account in accounts
            if not is_elevated_fraud_account(account)
            and not is_high_fraud_account(account)
        ]
    )

    print("Generating hubble query:")
    print("")
    print(
        f"with t (token, fraud_tier) as (VALUES {', '.join(data)}) select token, fraud_tier, case when fraud_tier = 'tier_3_elevated' then 'disputes,behavior,business_model' when fraud_tier = 'tier_4_high' then 'bank_account,transaction_patterns,business_info' else '' end as indicators from t order by token desc"
    )
    print("")

    print(
        "Create a query using at https://hubble.corp.stripe.com/queries using the above"
    )

    migration_link = (
        "https://admin.corp.stripe.com/migrations/clone/mijob_PyiKrEisTaNvpD"
        if demo_desk
        else "https://admin.corp.stripe.com/migrations/clone/mijob_Pri3K4TcGsSGar"
    )

    print(f"Then, clone this migration {migration_link}")


def main(
    create_accounts=False,
    create_charges=False,
    create_payouts=False,
    create_issuing=False,
    create_treasury=False,
    create_support=False,
    untag_support=False,
    rebalance=False,
    shell=False,
    delete=False,
    export_sonar_data=False,
    demo_desk=False,
):
    config = dotenv_values(
        os.path.join(ROOT_DIR, ".env.demo" if demo_desk else ".env.local")
    )
    if "STRIPE_SECRET_KEY" not in config:
        raise ValueError("STRIPE_SECRET_KEY is not defined in the environment")

    stripe.api_key = config["STRIPE_SECRET_KEY"]

    if shell:
        import pdb

        pdb.set_trace()

        exit()

    # Reset if we need to
    if delete:
        delete_accounts()

    if export_sonar_data:
        generate_sonar_data(demo_desk=demo_desk)

        exit()

    ensure_accounts(create=create_accounts)

    if rebalance or create_accounts:
        rebalance_account_statuses()

    accounts = fetch_accounts()

    for account in accounts:
        resolve_requirements(account)

        ensure_account_configuration(account)

    for account in accounts:
        # Ensure each account has a financial account
        ensure_financial_account(account)

    for account in accounts:
        # Update the status of the account
        update_account_status(account)

    # Update the most recent 30 accounts, for performance
    accounts = fetch_accounts(limit=30)

    log.info(f"Populating data for the most recent {len(accounts)} accounts")

    for account in accounts:
        generate_account_sessions(account)

    if create_charges:
        charge_args = []
        for account in accounts:
            charge_args += generate_charges_args(account)

        # Randomize the args
        random.shuffle(charge_args)
        for args in charge_args:
            apply_charges(*args)

    if create_payouts:
        for account in accounts:
            # Populate payouts
            generate_payouts(account)

    if create_issuing:
        for account in accounts:
            # Populate cardholders and cards
            generate_cardholders_and_cards(account)

    if create_treasury:
        for account in accounts:
            # Populate financial account transactions
            generate_financial_account_transactions(account)

    for account in accounts:
        if untag_support and has_support_ticket(account):
            # Remove the support ticket tag
            stripe.Account.modify(
                account.id,
                metadata={
                    SUPPORT_TICKET_ADDED_TAG: "",
                },
            )

        if create_support:
            # Generate a support ticket
            generate_support_ticket(account, skip_existing=not untag_support)

    log.info("All done")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--shell", help="Enter a shell, and then exit after", action="store_true"
    )

    parser.add_argument(
        "-a",
        "--create-accounts",
        help="Create accounts",
        action="store_true",
        dest="create_accounts",
    )
    parser.add_argument("-c", "--charges", help="Generate charges", action="store_true")
    parser.add_argument("-p", "--payouts", help="Generate payouts", action="store_true")
    parser.add_argument(
        "-i", "--issuing", help="Generate Issuing data", action="store_true"
    )
    parser.add_argument(
        "-t", "--treasury", help="Generate Treasury data", action="store_true"
    )

    parser.add_argument(
        "--untag-support",
        help="Remove the tags for support tickets, allowing the action to run again",
        action="store_true",
        dest="untag_support",
    )
    parser.add_argument(
        "-s", "--support", help="Generate support ticket data", action="store_true"
    )

    parser.add_argument(
        "-e",
        "--export-sonar-data",
        help="Export Sonar data",
        action="store_true",
        dest="export_sonar_data",
    )

    parser.add_argument(
        "-d", "--delete", help="Delete all accounts", action="store_true"
    )
    parser.add_argument(
        "-r", "--rebalance", help="Rebalance account statuses", action="store_true"
    )

    parser.add_argument(
        "--demo-desk",
        help="Use the demo desk env variables",
        action="store_true",
        dest="demo_desk",
    )

    args = parser.parse_args()

    main(
        create_accounts=args.create_accounts,
        create_charges=args.charges,
        create_payouts=args.payouts,
        create_issuing=args.issuing,
        create_treasury=args.treasury,
        create_support=args.support,
        untag_support=args.untag_support,
        rebalance=args.rebalance,
        shell=args.shell,
        delete=args.delete,
        export_sonar_data=args.export_sonar_data,
        demo_desk=args.demo_desk,
    )
