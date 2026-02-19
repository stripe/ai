"""JSON Schema to Pydantic model conversion utilities."""

from enum import Enum
from typing import Any, Dict, List, Optional, Type, Tuple
from pydantic import BaseModel, Field, create_model


def json_schema_to_pydantic_fields(
    schema: Optional[Dict[str, Any]]
) -> Dict[str, Tuple[Any, Any]]:
    """
    Convert a JSON Schema to Pydantic field definitions.

    Args:
        schema: JSON Schema dict with 'type', 'properties', 'required'

    Returns:
        Dict of {field_name: (type, FieldInfo)} suitable for create_model()
    """
    if not schema or schema.get("type") != "object":
        return {}

    properties = schema.get("properties", {})
    required = set(schema.get("required", []))

    fields: Dict[str, Tuple[Any, Any]] = {}

    for key, prop_schema in properties.items():
        prop = prop_schema if isinstance(prop_schema, dict) else {}

        # Determine Python type
        json_type = prop.get("type", "string")
        enum_values = prop.get("enum")

        python_type: Any
        if json_type == "string":
            if enum_values:
                # Create enum type dynamically
                enum_class = Enum(
                    f"{key}_enum",
                    {str(v): str(v) for v in enum_values}
                )
                python_type = enum_class
            else:
                python_type = str
        elif json_type == "number":
            python_type = float
        elif json_type == "integer":
            python_type = int
        elif json_type == "boolean":
            python_type = bool
        elif json_type == "array":
            items = prop.get("items", {})
            item_type = items.get("type", "string")
            if item_type == "string":
                python_type = List[str]
            elif item_type == "number":
                python_type = List[float]
            elif item_type == "integer":
                python_type = List[int]
            else:
                python_type = List[Any]
        elif json_type == "object":
            python_type = Dict[str, Any]
        else:
            python_type = Any

        # Build FieldInfo
        description = prop.get("description")
        is_required = key in required

        if is_required:
            field_info = (
                Field(..., description=description)
                if description
                else Field(...)
            )
        else:
            field_info = (
                Field(default=None, description=description)
                if description
                else Field(default=None)
            )
            python_type = Optional[python_type]

        fields[key] = (python_type, field_info)

    return fields


def json_schema_to_pydantic_model(
    schema: Optional[Dict[str, Any]],
    model_name: str = "DynamicModel"
) -> Type[BaseModel]:
    """
    Convert a JSON Schema to a Pydantic model class.

    Args:
        schema: JSON Schema dict with 'type', 'properties', 'required'
        model_name: Name for the generated model class

    Returns:
        A Pydantic BaseModel subclass
    """
    fields = json_schema_to_pydantic_fields(schema)

    if not fields:
        # Return an empty model that accepts any fields
        class EmptyModel(BaseModel):
            model_config = {"extra": "allow"}

        EmptyModel.__name__ = model_name
        return EmptyModel

    # Create model dynamically with extra="allow" config
    model = create_model(
        model_name,
        __config__=None,  # type: ignore
        **fields  # type: ignore
    )

    # Set extra="allow" on the created model
    model.model_config = {"extra": "allow"}

    return model
