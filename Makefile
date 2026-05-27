dev:
	uv run uvicorn src.app:create_app --factory --reload

test:
	uv run pytest tests

lint:
	uv run ruff check src tests
	uv run ruff format --check src tests

typecheck:
	uv run mypy --strict src

migrate:
	uv run alembic upgrade head

migration:
	@read -p "Migration message: " msg; \
	uv run alembic revision --autogenerate -m "$$msg"

check: lint typecheck tach-check test

tach-check:
	uv run tach check
