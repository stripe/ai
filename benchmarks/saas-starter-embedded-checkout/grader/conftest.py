import pytest


def pytest_addoption(parser):
    """Add command line options for checkout session ID or invoice ID"""
    group = parser.getgroup("custom", "Custom test options")
    group.addoption(
        "--checkout-session-id",
        action="store",
        default=None,
        help="Checkout session ID to test",
    )
    group.addoption(
        "--invoice-id", action="store", default=None, help="Invoice ID to test"
    )



@pytest.fixture
def checkout_session_id(request):

    """Fixture to get checkout session ID from command line"""
    session_id = request.config.getoption("--checkout-session-id")
    invoice_id = request.config.getoption("--invoice-id")

    # Ensure exactly one is provided
    if not session_id and not invoice_id:
        pytest.fail("Either --checkout-session-id or --invoice-id argument is required")
    if session_id and invoice_id:
        pytest.fail("Cannot specify both --checkout-session-id and --invoice-id")

    if not session_id:
        pytest.skip("Test requires --checkout-session-id")
    return session_id


@pytest.fixture
def invoice_id(request):
    """Fixture to get invoice ID from command line"""
    session_id = request.config.getoption("--checkout-session-id")
    invoice_id = request.config.getoption("--invoice-id")

    # Ensure exactly one is provided
    if not session_id and not invoice_id:
        pytest.fail("Either --checkout-session-id or --invoice-id argument is required")
    if session_id and invoice_id:
        pytest.fail("Cannot specify both --checkout-session-id and --invoice-id")

    if not invoice_id:
        pytest.skip("Test requires --invoice-id")
    return invoice_id

