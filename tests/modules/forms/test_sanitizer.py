from typing import Optional, List
from pydantic import BaseModel, Field
from src.modules.forms.llm.schema import export_schema, sanitize_strict


class MockConstrainedModel(BaseModel):
    name: str = Field(pattern="^[a-zA-Z]+$", min_length=3, max_length=50)
    score: int = Field(gt=0, le=100)
    email: str = Field(json_schema_extra={"format": "email"})
    tags: List[str] = Field(min_length=1)
    notes: Optional[str] = Field(default=None)


def test_sanitizer_removes_unsupported_and_sets_strict() -> None:
    raw_schema = export_schema(MockConstrainedModel)

    # Verify raw schema has the constraints before sanitization
    assert "pattern" in raw_schema["properties"]["name"]
    assert "minLength" in raw_schema["properties"]["name"]
    assert "maxLength" in raw_schema["properties"]["name"]
    assert "exclusiveMinimum" in raw_schema["properties"]["score"]
    assert "maximum" in raw_schema["properties"]["score"]

    sanitized = sanitize_strict(raw_schema)

    # Check that forbidden keywords are gone from all fields
    name_props = sanitized["properties"]["name"]
    assert "pattern" not in name_props
    assert "minLength" not in name_props
    assert "maxLength" not in name_props

    score_props = sanitized["properties"]["score"]
    assert "minimum" not in score_props
    assert "exclusiveMinimum" not in score_props
    assert "maximum" not in score_props

    tags_props = sanitized["properties"]["tags"]
    assert "minItems" not in tags_props
    assert "minLength" not in tags_props

    # Check that all properties are required
    expected_required = ["name", "score", "email", "tags", "notes"]
    assert sorted(sanitized["required"]) == sorted(expected_required)

    # Check that additionalProperties is false
    assert sanitized["additionalProperties"] is False


def test_sanitizer_empty_object() -> None:
    """Test sanitization of an empty object schema (no properties)."""
    empty_object_schema = {"type": "object", "properties": {}}
    sanitized = sanitize_strict(empty_object_schema)
    assert sanitized["additionalProperties"] is False
    assert "required" not in sanitized


def test_sanitizer_anyof() -> None:
    """Test sanitization of a schema with a top-level anyOf."""
    anyof_schema = {"anyOf": [{"type": "string"}, {"type": "number"}]}
    sanitized = sanitize_strict(anyof_schema)
    assert "anyOf" not in sanitized
