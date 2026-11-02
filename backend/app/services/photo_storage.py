"""Private object storage for tracking-sheet photos."""

from __future__ import annotations

import os
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import boto3
from botocore.config import Config

from app.core.config import settings


class PhotoStorageNotConfigured(RuntimeError):
    """Raised when production is missing its private photo bucket settings."""


@lru_cache(maxsize=1)
def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.photo_endpoint or None,
        aws_access_key_id=settings.photo_access_key_id,
        aws_secret_access_key=settings.photo_secret_access_key,
        region_name=settings.photo_region,
        config=Config(s3={"addressing_style": "path"}),
    )


def _bucket() -> str:
    if settings.photo_bucket:
        if not settings.photo_access_key_id or not settings.photo_secret_access_key or not settings.photo_endpoint:
            raise PhotoStorageNotConfigured("Photo bucket credentials are incomplete")
        return settings.photo_bucket
    if os.getenv("RAILWAY_ENVIRONMENT_NAME"):
        raise PhotoStorageNotConfigured("Configure a private Railway photo bucket before accepting uploads")
    return ""


def _local_path(key: str) -> Path:
    root = Path(settings.photo_local_directory).resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Invalid photo key")
    return path


def put_photo(key: str, data: bytes, content_type: str) -> None:
    bucket = _bucket()
    if bucket:
        _s3_client().put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
        return
    path = _local_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def read_photo(key: str) -> bytes:
    bucket = _bucket()
    if bucket:
        response = _s3_client().get_object(Bucket=bucket, Key=key)
        return response["Body"].read()
    return _local_path(key).read_bytes()


def delete_photo(key: str) -> None:
    bucket = _bucket()
    if bucket:
        _s3_client().delete_object(Bucket=bucket, Key=key)
        return
    try:
        _local_path(key).unlink(missing_ok=True)
    except FileNotFoundError:
        pass


def optimize_photo(source: bytes) -> bytes:
    """Validate and resize an uploaded image, stripping metadata in the process."""
    from PIL import Image, ImageOps, UnidentifiedImageError
    from pillow_heif import register_heif_opener

    register_heif_opener()

    try:
        with Image.open(BytesIO(source)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP", "HEIF"}:
                raise ValueError("Use a JPEG, PNG, WebP, or HEIC image")
            if getattr(image, "is_animated", False):
                raise ValueError("Animated images are not supported")
            if image.width * image.height > 24_000_000:
                raise ValueError("Image dimensions are too large")
            image = ImageOps.exif_transpose(image)
            image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
            if "A" in image.getbands():
                image = image.convert("RGBA")
            else:
                image = image.convert("RGB")
            result = BytesIO()
            image.save(result, format="WEBP", quality=82, method=5)
            return result.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError("This file is not a readable image") from error
