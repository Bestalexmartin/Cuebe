"""
Blok 008: Redis Support, connection management and generic primitives.

Provides parallel sync and async surfaces over redis-py:

- RedisService / get_redis(): synchronous client for FastAPI sync endpoints, scripts, jobs
- AsyncRedisService / get_async_redis(): asynchronous client for FastAPI middleware,
  async endpoints, and any path that runs on the event loop

Both surfaces share the same REDIS_URL but hold separate connection pools. The async
surface mirrors the sync API one-for-one so callers can pick the variant that matches
their concurrency model without learning a new vocabulary.

Primitives:
- Connection management
- Atomic increment with TTL
- Sliding-window rate limiting
- Generic JSON caching
- Binary blob caching with content-type / ETag / Last-Modified metadata
- Variadic key deletion
- Publish / subscribe messaging (fire-and-forget fan-out)
"""
import base64
import json
import time
from functools import lru_cache

import redis
import redis.asyncio as aioredis

from config import settings


def _decode_message(data):
    """Decode a pub/sub payload: JSON if it parses, otherwise the raw string.

    Mirrors the encoding in publish(): dict/list senders are JSON-decoded back
    into Python objects; plain-string senders pass through untouched.
    """
    if isinstance(data, (bytes, bytearray)):
        data = data.decode("utf-8", "replace")
    try:
        return json.loads(data)
    except (ValueError, TypeError):
        return data


class RedisService:
    """Synchronous Redis service for real-time operations."""

    def __init__(self, redis_url: str):
        self.client = redis.from_url(redis_url, decode_responses=True)

    def ping(self) -> bool:
        """Check Redis connection."""
        try:
            return self.client.ping()
        except redis.ConnectionError:
            return False

    def increment_counter(self, key: str, ttl_seconds: int = 86400) -> int:
        """
        Atomically increment a counter with expiration.

        Args:
            key: The Redis key to increment
            ttl_seconds: Time-to-live in seconds (default: 24 hours)

        Returns:
            The new counter value
        """
        pipe = self.client.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl_seconds)
        results = pipe.execute()
        return results[0]

    def get_counter(self, key: str) -> int:
        """Get the current value of a counter. Returns 0 if the key doesn't exist."""
        value = self.client.get(key)
        return int(value) if value else 0

    def check_rate_limit(
        self,
        subject: str,
        limit: int,
        window_seconds: int = 60
    ) -> tuple[bool, int, int]:
        """
        Check if a request is within rate limits using a fixed window.

        Args:
            subject: Identifier to rate-limit on (org id, user id, IP, token, etc.)
            limit: Maximum requests allowed in window
            window_seconds: Window size in seconds

        Returns:
            Tuple of (allowed, current_count, remaining)
        """
        window_start = int(time.time()) // window_seconds
        key = f"usage:{subject}:ratelimit:{window_start}"

        current = self.increment_counter(key, window_seconds + 1)
        remaining = max(0, limit - current)
        allowed = current <= limit

        return allowed, current, remaining

    def cache_get(self, key: str) -> dict | None:
        """Get a JSON-serialized cached value. Returns None on miss."""
        data = self.client.get(key)
        if data:
            return json.loads(data)
        return None

    def cache_set(self, key: str, data: dict, ttl_seconds: int = 300) -> None:
        """Set a JSON-serialized value with TTL."""
        self.client.setex(key, ttl_seconds, json.dumps(data, default=str))

    def cache_get_blob(self, key: str) -> dict | None:
        """
        Get a cached binary payload.

        Returns the metadata dict from cache_set_blob with `data_b64` decoded into
        bytes under `data`. Returns None on miss or if the payload is malformed.
        """
        payload = self.cache_get(key)
        if not payload or "data_b64" not in payload:
            return None
        return {**payload, "data": base64.b64decode(payload["data_b64"])}

    def cache_set_blob(
        self,
        key: str,
        *,
        data: bytes,
        content_type: str,
        etag: str | None = None,
        last_modified: str | None = None,
        ttl_seconds: int = 1800,
    ) -> None:
        """Store a binary payload plus HTTP cache metadata using JSON-safe encoding."""
        self.cache_set(
            key,
            {
                "data_b64": base64.b64encode(data).decode("ascii"),
                "content_type": content_type,
                "etag": etag,
                "last_modified": last_modified,
            },
            ttl_seconds=ttl_seconds,
        )

    def delete_keys(self, *keys: str) -> None:
        """Delete one or more keys. Falsy keys are skipped; no-op on empty input."""
        filtered = [key for key in keys if key]
        if filtered:
            self.client.delete(*filtered)

    def publish(self, channel: str, message) -> int:
        """Publish a message to a channel (fire-and-forget fan-out).

        dict / list payloads are JSON-encoded; str payloads are sent as-is.
        Returns the number of subscribers that received the message (0 if
        nobody is listening; pub/sub does not buffer for absent subscribers).
        """
        payload = message if isinstance(message, str) else json.dumps(message, default=str)
        return self.client.publish(channel, payload)

    def subscribe(self, *channels: str):
        """Subscribe to one or more channels, yielding messages as they arrive.

        Yields dicts shaped ``{"channel": str, "data": <decoded>}`` where
        ``data`` is JSON-decoded when possible (see _decode_message). This is a
        blocking generator: iterate it to consume, and close it (break out of
        the loop or call .close()) to tear down the underlying connection.
        Subscribe-confirmation frames are suppressed; only real messages yield.
        """
        pubsub = self.client.pubsub(ignore_subscribe_messages=True)
        pubsub.subscribe(*channels)
        try:
            for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                yield {"channel": message["channel"], "data": _decode_message(message["data"])}
        finally:
            pubsub.close()


class AsyncRedisService:
    """Asynchronous Redis service. Mirrors RedisService 1:1 with awaitable methods."""

    def __init__(self, redis_url: str):
        self.client: aioredis.Redis = aioredis.from_url(redis_url, decode_responses=True)

    async def ping(self) -> bool:
        """Check Redis connection."""
        try:
            return await self.client.ping()
        except redis.ConnectionError:
            return False

    async def increment_counter(self, key: str, ttl_seconds: int = 86400) -> int:
        """Atomically increment a counter with expiration."""
        async with self.client.pipeline() as pipe:
            pipe.incr(key)
            pipe.expire(key, ttl_seconds)
            results = await pipe.execute()
        return results[0]

    async def get_counter(self, key: str) -> int:
        """Get the current value of a counter. Returns 0 if the key doesn't exist."""
        value = await self.client.get(key)
        return int(value) if value else 0

    async def check_rate_limit(
        self,
        subject: str,
        limit: int,
        window_seconds: int = 60
    ) -> tuple[bool, int, int]:
        """Fixed-window rate limit check; see RedisService.check_rate_limit."""
        window_start = int(time.time()) // window_seconds
        key = f"usage:{subject}:ratelimit:{window_start}"

        current = await self.increment_counter(key, window_seconds + 1)
        remaining = max(0, limit - current)
        allowed = current <= limit

        return allowed, current, remaining

    async def cache_get(self, key: str) -> dict | None:
        """Get a JSON-serialized cached value. Returns None on miss."""
        data = await self.client.get(key)
        if data:
            return json.loads(data)
        return None

    async def cache_set(self, key: str, data: dict, ttl_seconds: int = 300) -> None:
        """Set a JSON-serialized value with TTL."""
        await self.client.setex(key, ttl_seconds, json.dumps(data, default=str))

    async def cache_get_blob(self, key: str) -> dict | None:
        """Get a cached binary payload; see RedisService.cache_get_blob."""
        payload = await self.cache_get(key)
        if not payload or "data_b64" not in payload:
            return None
        return {**payload, "data": base64.b64decode(payload["data_b64"])}

    async def cache_set_blob(
        self,
        key: str,
        *,
        data: bytes,
        content_type: str,
        etag: str | None = None,
        last_modified: str | None = None,
        ttl_seconds: int = 1800,
    ) -> None:
        """Store a binary payload plus HTTP cache metadata; see RedisService.cache_set_blob."""
        await self.cache_set(
            key,
            {
                "data_b64": base64.b64encode(data).decode("ascii"),
                "content_type": content_type,
                "etag": etag,
                "last_modified": last_modified,
            },
            ttl_seconds=ttl_seconds,
        )

    async def delete_keys(self, *keys: str) -> None:
        """Delete one or more keys. Falsy keys are skipped; no-op on empty input."""
        filtered = [key for key in keys if key]
        if filtered:
            await self.client.delete(*filtered)

    async def publish(self, channel: str, message) -> int:
        """Publish a message to a channel; see RedisService.publish."""
        payload = message if isinstance(message, str) else json.dumps(message, default=str)
        return await self.client.publish(channel, payload)

    async def subscribe(self, *channels: str):
        """Async-iterate messages on one or more channels; see RedisService.subscribe.

        Usage::

            async for msg in get_async_redis().subscribe("alerts:42"):
                handle(msg["data"])

        The connection is unsubscribed and closed when the async generator is
        closed (e.g. the consuming ``async for`` breaks or the task is cancelled).
        """
        pubsub = self.client.pubsub(ignore_subscribe_messages=True)
        await pubsub.subscribe(*channels)
        try:
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                yield {"channel": message["channel"], "data": _decode_message(message["data"])}
        finally:
            await pubsub.unsubscribe(*channels)
            # redis-py 5.x prefers aclose(); fall back to close() on 4.x.
            closer = getattr(pubsub, "aclose", None) or pubsub.close
            await closer()


@lru_cache
def get_redis() -> RedisService:
    """Get the synchronous Redis service singleton."""
    return RedisService(settings.redis_url)


@lru_cache
def get_async_redis() -> AsyncRedisService:
    """Get the asynchronous Redis service singleton."""
    return AsyncRedisService(settings.redis_url)
