"""Request and response schemas for houses."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HouseCreate(BaseModel):
    """Data needed to create a house."""

    name: str = Field(min_length=1, max_length=255)
    address: str = Field(min_length=1, max_length=500)

    @field_validator("name", "address")
    @classmethod
    def cannot_be_blank(cls, value: str) -> str:
        """Trim user input and reject strings made only of whitespace."""
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class HouseRead(HouseCreate):
    """A house returned from the API."""

    id: int

    model_config = ConfigDict(from_attributes=True)
