"""Tests for AsyncInitializer utility."""

import asyncio
import pytest
from stripe_agent_toolkit.shared.async_initializer import AsyncInitializer


class TestAsyncInitializer:
    """Tests for the AsyncInitializer class."""

    @pytest.fixture
    def initializer(self):
        """Create a fresh AsyncInitializer for each test."""
        return AsyncInitializer()

    async def test_not_initialized_by_default(self, initializer):
        """Initializer should not be initialized by default."""
        assert not initializer.is_initialized

    async def test_initialize_once(self, initializer):
        """Initialize should call the init function once."""
        call_count = 0

        async def init_fn():
            nonlocal call_count
            call_count += 1

        await initializer.initialize(init_fn)

        assert initializer.is_initialized
        assert call_count == 1

    async def test_initialize_idempotent(self, initializer):
        """Multiple initialize calls should only run init once."""
        call_count = 0

        async def init_fn():
            nonlocal call_count
            call_count += 1

        await initializer.initialize(init_fn)
        await initializer.initialize(init_fn)
        await initializer.initialize(init_fn)

        assert call_count == 1

    async def test_concurrent_initialize(self, initializer):
        """Concurrent initialize calls should only run init once."""
        call_count = 0
        event = asyncio.Event()

        async def slow_init():
            nonlocal call_count
            call_count += 1
            await event.wait()

        # Start multiple concurrent initializations
        task1 = asyncio.create_task(initializer.initialize(slow_init))
        task2 = asyncio.create_task(initializer.initialize(slow_init))
        task3 = asyncio.create_task(initializer.initialize(slow_init))

        # Let them start
        await asyncio.sleep(0.01)

        # Release the init function
        event.set()

        # Wait for all to complete
        await asyncio.gather(task1, task2, task3)

        assert call_count == 1
        assert initializer.is_initialized

    async def test_reset_allows_reinitialize(self, initializer):
        """Reset should allow reinitialization."""
        call_count = 0

        async def init_fn():
            nonlocal call_count
            call_count += 1

        await initializer.initialize(init_fn)
        assert call_count == 1

        initializer.reset()
        assert not initializer.is_initialized

        await initializer.initialize(init_fn)
        assert call_count == 2

    async def test_initialize_propagates_error(self, initializer):
        """Errors during initialization should propagate."""
        async def failing_init():
            raise ValueError("Init failed")

        with pytest.raises(ValueError, match="Init failed"):
            await initializer.initialize(failing_init)

        # After failure, should not be initialized
        assert not initializer.is_initialized

    async def test_retry_after_failure(self, initializer):
        """Should be able to retry after a failure."""
        attempt = 0

        async def init_fn():
            nonlocal attempt
            attempt += 1
            if attempt == 1:
                raise ValueError("First attempt fails")
            # Second attempt succeeds

        # First attempt fails
        with pytest.raises(ValueError):
            await initializer.initialize(init_fn)

        # Second attempt should succeed
        await initializer.initialize(init_fn)

        assert initializer.is_initialized
        assert attempt == 2
