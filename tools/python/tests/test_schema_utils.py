"""Tests for schema_utils module."""

import pytest
from pydantic import BaseModel, ValidationError
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
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "name" in fields
        assert fields["name"][0] is str

    def test_integer_field(self):
        """Integer type maps to int."""
        schema = {
            "type": "object",
            "properties": {"count": {"type": "integer"}},
            "required": ["count"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "count" in fields
        assert fields["count"][0] is int

    def test_number_field(self):
        """Number type maps to float."""
        schema = {
            "type": "object",
            "properties": {"price": {"type": "number"}},
            "required": ["price"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "price" in fields
        assert fields["price"][0] is float

    def test_boolean_field(self):
        """Boolean type maps to bool."""
        schema = {
            "type": "object",
            "properties": {"active": {"type": "boolean"}},
            "required": ["active"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "active" in fields
        assert fields["active"][0] is bool

    def test_array_field(self):
        """Array type maps to List[Any]."""
        schema = {
            "type": "object",
            "properties": {"tags": {"type": "array"}},
            "required": ["tags"],
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
            "properties": {"metadata": {"type": "object"}},
            "required": ["metadata"],
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
                "description": {"type": "string"},
            },
            "required": ["name"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        # description should have a default of None
        assert fields["description"][1].default is None

    def test_array_with_string_items(self):
        """Array with string items maps to List[str]."""
        schema = {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                }
            },
            "required": ["tags"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "tags" in fields
        from typing import get_args, get_origin

        assert get_origin(fields["tags"][0]) is list
        assert get_args(fields["tags"][0]) == (str,)

    def test_array_with_integer_items(self):
        """Array with integer items maps to List[int]."""
        schema = {
            "type": "object",
            "properties": {
                "ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                }
            },
            "required": ["ids"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "ids" in fields
        from typing import get_args, get_origin

        assert get_origin(fields["ids"][0]) is list
        assert get_args(fields["ids"][0]) == (int,)

    def test_array_with_number_items(self):
        """Array with number items maps to List[float]."""
        schema = {
            "type": "object",
            "properties": {
                "scores": {
                    "type": "array",
                    "items": {"type": "number"},
                }
            },
            "required": ["scores"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "scores" in fields
        from typing import get_args, get_origin

        assert get_origin(fields["scores"][0]) is list
        assert get_args(fields["scores"][0]) == (float,)

    def test_array_with_unknown_item_type(self):
        """Array with unrecognized item type maps to List[Any]."""
        from typing import Any, get_args, get_origin

        schema = {
            "type": "object",
            "properties": {
                "data": {
                    "type": "array",
                    "items": {"type": "custom"},
                }
            },
            "required": ["data"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "data" in fields
        assert get_origin(fields["data"][0]) is list
        assert get_args(fields["data"][0]) == (Any,)

    def test_non_dict_property_schema(self):
        """Non-dict property value defaults to string type."""
        schema = {
            "type": "object",
            "properties": {"bad_prop": "not_a_dict"},
            "required": ["bad_prop"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "bad_prop" in fields
        # Falls back to default type (string)
        assert fields["bad_prop"][0] is str

    def test_description_on_required_field(self):
        """Required field preserves description in FieldInfo."""
        schema = {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "description": "Customer email",
                }
            },
            "required": ["email"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert fields["email"][1].description == "Customer email"

    def test_description_on_optional_field(self):
        """Optional field preserves description in FieldInfo."""
        schema = {
            "type": "object",
            "properties": {
                "note": {
                    "type": "string",
                    "description": "Optional note",
                }
            },
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert fields["note"][1].description == "Optional note"
        assert fields["note"][1].default is None

    def test_unknown_json_type(self):
        """Unknown JSON schema type maps to Any."""
        from typing import Any

        schema = {
            "type": "object",
            "properties": {"data": {"type": "custom_type"}},
            "required": ["data"],
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert "data" in fields
        assert fields["data"][0] is Any

    def test_non_object_schema_type(self):
        """Schema with type != 'object' returns empty dict."""
        schema = {"type": "array", "items": {"type": "string"}}
        result = json_schema_to_pydantic_fields(schema)
        assert result == {}

    def test_schema_no_properties_key(self):
        """Object schema with no properties returns empty dict."""
        schema = {"type": "object"}
        result = json_schema_to_pydantic_fields(schema)
        assert result == {}

    def test_schema_no_required_key(self):
        """All fields are optional when required key is missing."""
        schema = {
            "type": "object",
            "properties": {
                "a": {"type": "string"},
                "b": {"type": "integer"},
            },
        }
        fields = json_schema_to_pydantic_fields(schema)

        assert fields["a"][1].default is None
        assert fields["b"][1].default is None


class TestJsonSchemaToPydanticModel:
    """Tests for json_schema_to_pydantic_model."""

    def test_create_model_basic(self):
        """Create a basic model from schema."""
        schema = {
            "type": "object",
            "properties": {
                "email": {"type": "string"},
                "name": {"type": "string"},
            },
            "required": ["email"],
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
                "metadata": {"type": "object"},
            },
            "required": [
                "name",
                "count",
                "price",
                "active",
                "tags",
                "metadata",
            ],
        }

        Model = json_schema_to_pydantic_model(schema, "AllTypesArgs")

        instance = Model(
            name="test",
            count=42,
            price=19.99,
            active=True,
            tags=["a", "b"],
            metadata={"key": "value"},
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
                "status": {"type": "string", "enum": ["active", "inactive"]}
            },
            "required": ["status"],
        }

        Model = json_schema_to_pydantic_model(schema, "StatusArgs")

        # Valid enum value should work - it will be an enum member
        instance = Model(status="active")
        assert instance.status.value == "active"

    def test_optional_field_accepts_none(self):
        """Optional fields accept None values."""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "note": {"type": "string"},
            },
            "required": ["name"],
        }

        Model = json_schema_to_pydantic_model(schema, "Args")
        instance = Model(name="test", note=None)
        assert instance.note is None

    def test_required_field_rejects_missing(self):
        """Missing required field raises ValidationError."""
        schema = {
            "type": "object",
            "properties": {
                "email": {"type": "string"},
            },
            "required": ["email"],
        }

        Model = json_schema_to_pydantic_model(schema, "Args")
        with pytest.raises(ValidationError):
            Model()

    def test_extra_fields_allowed(self):
        """Models accept extra fields not in the schema."""
        schema = {
            "type": "object",
            "properties": {
                "known": {"type": "string"},
            },
            "required": ["known"],
        }

        Model = json_schema_to_pydantic_model(schema, "Args")
        instance = Model(known="v", extra_field="surprise")
        # In Pydantic v2, extra fields are stored in `model_extra` if not explicitly defined
        assert instance.model_extra["extra_field"] == "surprise"

    def test_default_model_name(self):
        """Omitting model_name defaults to 'DynamicModel'."""
        schema = {
            "type": "object",
            "properties": {
                "x": {"type": "string"},
            },
        }
        Model = json_schema_to_pydantic_model(schema)
        assert Model.__name__ == "DynamicModel"

    def test_enum_rejects_invalid_value(self):
        """Invalid enum value raises ValidationError."""
        schema = {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["active", "inactive"],
                }
            },
            "required": ["status"],
        }

        Model = json_schema_to_pydantic_model(schema, "StatusArgs2")
        with pytest.raises(ValidationError):
            Model(status="deleted")

    def test_mixed_required_optional_instantiation(self):
        """Model with mixed required/optional fields works."""
        schema = {
            "type": "object",
            "properties": {
                "customer": {"type": "string"},
                "amount": {"type": "integer"},
                "currency": {
                    "type": "string",
                    "description": "Three-letter ISO code",
                },
                "description": {"type": "string"},
            },
            "required": ["customer", "amount"],
        }

        Model = json_schema_to_pydantic_model(schema, "InvoiceArgs")

        instance = Model(
            customer="cus_123",
            amount=5000,
        )
        assert instance.customer == "cus_123"
        assert instance.amount == 5000
        assert instance.currency is None
        assert instance.description is None

        instance_full = Model(
            customer="cus_123",
            amount=5000,
            currency="usd",
            description="Test invoice",
        )
        assert instance_full.currency == "usd"
        assert instance_full.description == "Test invoice"
