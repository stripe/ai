"""Tests for schema_utils module."""

import pytest
from pydantic import BaseModel
from stripe_agent_toolkit.shared.schema_utils import (
    json_schema_to_pydantic_model,
    json_schema_to_pydantic_fields,
)


class TestJsonSchemaToPydanticFields:
    """Tests for json_schema_to_pydantic_fields."""

    def test_empty_schema(self):
        """Empty schema returns empty dict."""
        result = json_schema_to_pydantic_fields({})
        assert result == {}

    def test_none_schema(self):
        """None schema returns empty dict."""
        result = json_schema_to_pydantic_fields(None)
        assert result == {}

    def test_string_field(self):
        """String type maps to str."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"}
            },
            "required": ["name"]
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "name" in fields
        assert fields["name"][0] is str

    def test_integer_field(self):
        """Integer type maps to int."""
        schema = {
            "type": "object",
            "properties": {
                "count": {"type": "integer"}
            },
            "required": ["count"]
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "count" in fields
        assert fields["count"][0] is int

    def test_number_field(self):
        """Number type maps to float."""
        schema = {
            "type": "object",
            "properties": {
                "price": {"type": "number"}
            },
            "required": ["price"]
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "price" in fields
        assert fields["price"][0] is float

    def test_boolean_field(self):
        """Boolean type maps to bool."""
        schema = {
            "type": "object",
            "properties": {
                "active": {"type": "boolean"}
            },
            "required": ["active"]
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "active" in fields
        assert fields["active"][0] is bool

    def test_array_field(self):
        """Array type maps to List[Any]."""
        schema = {
            "type": "object",
            "properties": {
                "tags": {"type": "array"}
            },
            "required": ["tags"]
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "tags" in fields
        # Array without items becomes List[Any]
        from typing import get_origin
        assert get_origin(fields["tags"][0]) is list

    def test_object_field(self):
        """Object type maps to Dict[str, Any]."""
        schema = {
            "type": "object",
            "properties": {
                "metadata": {"type": "object"}
            },
            "required": ["metadata"]
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "metadata" in fields
        from typing import get_origin
        assert get_origin(fields["metadata"][0]) is dict

    def test_optional_field(self):
        """Fields not in required should be optional."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"}
            },
            "required": ["name"]
        }
        fields = json_schema_to_pydantic_fields(schema)

        # description should have a default of None
        assert fields["description"][1].default is None


class TestJsonSchemaToPydanticModel:
    """Tests for json_schema_to_pydantic_model."""

    def test_create_model_basic(self):
        """Create a basic model from schema."""
        schema = {
            "type": "object",
            "properties": {
                "email": {"type": "string"},
                "name": {"type": "string"}
            },
            "required": ["email"]
        }

        Model = json_schema_to_pydantic_model(schema, "CustomerArgs")

        assert issubclass(Model, BaseModel)
        assert Model.__name__ == "CustomerArgs"

        # Should be able to instantiate with required field
        instance = Model(email="test@example.com")
        assert instance.email == "test@example.com"
        assert instance.name is None

    def test_create_model_all_types(self):
        """Create model with all supported types."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "count": {"type": "integer"},
                "price": {"type": "number"},
                "active": {"type": "boolean"},
                "tags": {"type": "array"},
                "metadata": {"type": "object"}
            },
            "required": ["name", "count", "price", "active", "tags", "metadata"]
        }

        Model = json_schema_to_pydantic_model(schema, "AllTypesArgs")

        instance = Model(
            name="test",
            count=42,
            price=19.99,
            active=True,
            tags=["a", "b"],
            metadata={"key": "value"}
        )

        assert instance.name == "test"
        assert instance.count == 42
        assert instance.price == 19.99
        assert instance.active is True
        assert instance.tags == ["a", "b"]
        assert instance.metadata == {"key": "value"}

    def test_none_schema_returns_empty_model(self):
        """None schema returns empty model that accepts any fields."""
        Model = json_schema_to_pydantic_model(None, "Test")
        # Returns empty model instead of None
        assert issubclass(Model, BaseModel)
        # Empty model should allow extra fields
        instance = Model(any_field="value")
        assert instance.any_field == "value"

    def test_empty_schema_returns_empty_model(self):
        """Schema without type=object returns empty model."""
        Model = json_schema_to_pydantic_model({}, "Test")
        assert issubclass(Model, BaseModel)

    def test_enum_constraint(self):
        """Enum values should create enum type."""
        schema = {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["active", "inactive"]
                }
            },
            "required": ["status"]
        }

        Model = json_schema_to_pydantic_model(schema, "StatusArgs")

        # Valid enum value should work - it will be an enum member
        instance = Model(status="active")
        assert instance.status.value == "active"
