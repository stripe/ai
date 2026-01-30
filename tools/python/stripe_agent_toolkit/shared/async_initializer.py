"""Async initialization utility for Stripe Agent Toolkit."""

import asyncio
from typing import Callable, Awaitable, Optional


class AsyncInitializer:
    """
    A reusable utility for async initialization with future locking.
    Ensures initialization runs only once, even if called concurrently.
    """

    def __init__(self) -> None:
        self._initialized: bool = False
        self._init_future: Optional[asyncio.Future[None]] = None
        self._lock: asyncio.Lock = asyncio.Lock()

    async def initialize(
        self, do_initialize: Callable[[], Awaitable[None]]
    ) -> None:
        """
        Initialize using the provided coroutine function.

        - If already initialized, returns immediately
        - If initialization in progress, awaits existing future
        - If initialization fails, allows retry on next call

        Args:
            do_initialize: Async function that performs the actual
                initialization work.

        Raises:
            Exception: Re-raises any exception from do_initialize,
                allowing retry on next call.
        """
        if self._initialized:
            return

        async with self._lock:
            # Double-check after acquiring lock
            if self._initialized:
                return

            if self._init_future is not None:
                # Another coroutine is initializing, wait for it
                await self._init_future
                return

            # Create a new future for this initialization attempt
            loop = asyncio.get_running_loop()
            self._init_future = loop.create_future()

            try:
                await do_initialize()
                self._initialized = True
                self._init_future.set_result(None)
            except Exception as e:
                # Reset future on failure to allow retry
                self._init_future.set_exception(e)
                self._init_future = None
                raise

    @property
    def is_initialized(self) -> bool:
        """Check if initialization has completed successfully."""
        return self._initialized

    def reset(self) -> None:
        """Reset the initializer state. Used during close/cleanup."""
        self._initialized = False
        self._init_future = None
