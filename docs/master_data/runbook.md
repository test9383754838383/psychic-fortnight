# Block 2 — Master Data · Runbook

This runbook outlines operational procedures, common troubleshooting, and development workflows for the **Master Data** module (`Vessel`, `Port`, and `Counterparty`).

---

## 1. How to run locally

### One-Command Boot
To start the local development FastAPI server:
```bash
make dev
```
This boots the application using `uvicorn` on [http://localhost:8000](http://localhost:8000).

- **Database File**: Located at `dev.db` in the project root (SQLite).
- **Default Port**: `8000`.

### Seeding Minimum Test Data
We can seed test data via the REST API endpoints using standard HTTP clients (e.g. `curl` or `HTTPie`). Below are example payloads:

**1. Create a Counterparty:**
```bash
curl -X POST http://localhost:8000/api/v1/counterparties \
  -H "Content-Type: application/json" \
  -d '\''{
    "code": "CP-MAERSK",
    "name": "Maersk Line",
    "contacts": [
      {
        "name": "Jane Doe",
        "email": "jane@maersk.com",
        "phone": "+45 3363 3363",
        "role_hint": "Operations Director"
      }
    ]
  }'\''
```

**2. Attach a Role (e.g., Agent):**
```bash
curl -X POST http://localhost:8000/api/v1/counterparties/<counterparty_uuid>/roles \
  -H "Content-Type: application/json" \
  -d '\''{
    "role": "Agent",
    "ports_serviced": ["NLRTM", "USNYC"],
    "nomination_contact_email": "ops@maersk-agent.com"
  }'\''
```

**3. Create a Port:**
```bash
curl -X POST http://localhost:8000/api/v1/ports \
  -H "Content-Type: application/json" \
  -d '\''{
    "unlocode": "NLRTM",
    "name": "Rotterdam",
    "timezone": "Europe/Amsterdam",
    "latitude": 51.9244,
    "longitude": 4.4777,
    "distance_table_ref": "DIS-001"
  }'\''
```

### Inspecting the OpenAPI Schema
- **Swagger UI Interactive Docs**: Visit [http://localhost:8000/docs](http://localhost:8000/docs).
- **Raw OpenAPI JSON Spec**: Visit [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json).

---

## 2. How to run the tests

### Run the Full Suite
To run all tests (SQLite in-memory, zero mock persistence, TDD compliant):
```bash
make test
```
The suite typically executes all 85+ integration tests in less than 2 seconds.

### Run a Single Test
Run a specific test module or single test by passing the path:
```bash
uv run pytest tests/modules/master_data/test_port_service.py
```
Or for a specific test function:
```bash
uv run pytest tests/modules/master_data/test_port_service.py::test_create_port_happy_path
```

### Enable Verbose and Stdout Mode
To see detailed assertion outputs and log outputs:
```bash
uv run pytest -vv -s tests/
```

---

## 3. How to add a new migration

### Autogenerate Migrations
When ORM models change, autogenerate a batch-mode migration revision:
```bash
uv run alembic revision --autogenerate -m "add_my_new_field"
```

### Apply Migrations
Apply the migrations to the local SQLite database:
```bash
make migrate
```

### Constraints & Reminders
- **SQLite Batch Mode**: Configured in `alembic/env.py` (`render_as_batch=True`). Alembic automatically handles dropping/adding constraints and columns safely in SQLite.
- **Postgres Dialect Verification**: The CI suite replays the complete migrations history against an ephemeral Postgres container. Never bypass a CI migration failure by patching CI configuration; fix any dialect drift (e.g. using Postgres-specific types) in the migration revision file itself.

---

## 4. Common failure modes

### Duplicate `code` or `unlocode` (409 Conflict)
- **Problem**: Attempting to create a Port or Counterparty with a value that already exists.
- **Diagnostics**: Server returns a `409` HTTP response with details.
- **Resolution**: Check the table via GET first. Clean up duplicate entries by soft-deactivating `Active` ones if necessary.

### `InvalidUnlocodeError: prefix not in country table` (400 Bad Request)
- **Problem**: UN/LOCODE country prefix is unrecognized (e.g. `XXNYC`).
- **Diagnostics**: Traced to the static country reference list in `src/modules/master_data/reference/unlocode_country.py`.
- **Resolution**: Verify the code prefix. If a newly registered ISO country is missing, review and update the dictionary (`D-7` annual review cadence).

### `get_current_user_stub` CI Grep Failure
- **Problem**: A developer referenced `get_current_user_stub` outside of `tests/` or the central dependency file `src/dependencies.py`.
- **Diagnostics**: CI build script flags this usage to prevent leaks.
- **Resolution**: All business API endpoints must depend on the `get_current_user` dependency alias rather than referencing the stub method directly.

### Migration Smoke Test Failure on Postgres
- **Problem**: An Alembic script uses SQLite-only features or raw SQL strings that break Postgres syntax.
- **Diagnostics**: The Postgres container migration logs in CI will show specific driver/syntax syntax errors.
- **Resolution**: Replace any non-portable syntax with SQLAlchemy declarative statements or portable ANSI-SQL expressions.

---

## 5. Operational notes

- **Authentication Stub**: The API operates on a user session dependency stub (`get_current_user`). No real OAuth/RBAC controls are active in Block 2. **DO NOT DEPLOY THIS TO PRODUCTION** until the Auth block is fully implemented.
- **No Purge Policy**: Block 2 models enforce **Soft-Delete** only (status flips to `Inactive`). Hard-deleting rows via the API is forbidden to preserve referential history.

---

## 6. Useful URLs

- **Local Swagger Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Local Raw OpenAPI JSON Spec**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)
- **Committed OpenAPI Reference**: `openapi/openapi.json`

---

## 7. Where to look next

- **Detailed API contracts & DTO specs**: `docs/master_data/specifications.md`
- **Data models & strict database constraints**: `docs/master_data/architecture.md`
- **Tunable settings and floors (D-entries)**: `docs/master_data/specifications.md` §2
