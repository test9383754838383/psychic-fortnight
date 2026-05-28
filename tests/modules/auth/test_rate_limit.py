import pytest
from src.modules.auth.api.auth import limiter


@pytest.mark.asyncio
async def test_login_rate_limit(unauthenticated_client):
    # Temporarily enable the limiter for this test
    original_enabled = limiter.enabled
    limiter.enabled = True

    try:
        # We need to make 6 requests. The limit is 5/minute.
        for i in range(5):
            res = await unauthenticated_client.post(
                "/api/v1/auth/login", json={"username": "user", "password": "pw"}
            )
            # The requests should be processed. If auth fails, it returns 401.
            assert res.status_code in [401, 200]

        # 6th request should return 429
        res = await unauthenticated_client.post(
            "/api/v1/auth/login", json={"username": "user", "password": "pw"}
        )
        assert res.status_code == 429
    finally:
        limiter.enabled = original_enabled
