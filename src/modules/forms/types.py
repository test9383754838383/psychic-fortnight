from __future__ import annotations

# A parsed-fields JSON blob. Deliberately non-recursive: a recursive JsonValue
# (list[JsonValue] | dict[str, JsonValue]) exports to OpenAPI as a self-
# referential schema that openapi-typescript turns into a TS alias tsc rejects
# (TS2502). `object` values keep this mypy-strict clean with no `Any`.
type JsonObject = dict[str, object]
