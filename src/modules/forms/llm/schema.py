from typing import Any, Type
from pydantic import BaseModel

FORBIDDEN_KEYS = {
    "pattern",
    "format",
    "minLength",
    "maxLength",
    "minimum",
    "maximum",
    "minItems",
    "exclusiveMinimum",
    "exclusiveMaximum",
}


def export_schema(model: Type[BaseModel]) -> dict[str, Any]:
    """Export the JSON schema of a Pydantic model."""
    return model.model_json_schema()


def sanitize_strict(schema: dict[str, Any]) -> dict[str, Any]:
    """Recursively sanitize a JSON schema for OpenAI Structured Outputs strict mode.

    1. Removes strict-mode-unsupported keywords (pattern, format, minLength,
       maxLength, minimum, maximum, minItems).
    2. Marks every property as required.
    3. Sets additionalProperties: false.
    4. Removes top-level anyOf if present.
    """
    import copy

    schema_copy = copy.deepcopy(schema)

    def _sanitize(item: Any) -> None:
        if isinstance(item, dict):
            # If this is an object schema, enforce strict-mode requirements
            if item.get("type") == "object" or "properties" in item:
                properties = item.get("properties", {})
                if properties:
                    item["required"] = list(properties.keys())
                    item["additionalProperties"] = False
                else:
                    item["additionalProperties"] = False

            # Remove strict-mode-unsupported keywords
            keys_to_remove = [k for k in item if k in FORBIDDEN_KEYS]
            for k in keys_to_remove:
                item.pop(k)

            # Recurse into dict values
            for value in item.values():
                _sanitize(value)

        elif isinstance(item, list):
            # Recurse into list elements
            for element in item:
                _sanitize(element)

    _sanitize(schema_copy)

    # Remove top-level anyOf if present
    if "anyOf" in schema_copy:
        schema_copy.pop("anyOf")

    return schema_copy
