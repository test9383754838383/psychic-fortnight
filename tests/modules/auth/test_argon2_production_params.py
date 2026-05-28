import time
from argon2 import PasswordHasher
from src.config import settings


def test_argon2_production_params():
    # Verify that the production parameters match OWASP minimums or better
    assert settings.ARGON2_TIME_COST >= 2
    assert settings.ARGON2_MEMORY_COST >= 19456

    # Instantiate with production params from settings
    ph = PasswordHasher(
        time_cost=settings.ARGON2_TIME_COST,
        memory_cost=settings.ARGON2_MEMORY_COST,
        parallelism=settings.ARGON2_PARALLELISM,
    )

    password = "correct_horse_battery_staple"

    # Hash password
    t0 = time.perf_counter()
    hashed = ph.hash(password)
    t1 = time.perf_counter()

    # Verify password
    t2 = time.perf_counter()
    assert ph.verify(hashed, password)
    t3 = time.perf_counter()

    hash_elapsed = t1 - t0
    verify_elapsed = t3 - t2

    # Assert explicit timing threshold.
    # The production params (m=19456, t=2) generally take > 0.015s on modern CPUs.
    # The fast test params (m=256, t=1) take < 0.001s.
    # A threshold of 0.005s safely distinguishes them and proves production params are being tested.
    assert hash_elapsed > 0.005
    assert verify_elapsed > 0.005
