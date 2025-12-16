"""
Supabase Storage Service for Product Images
Handles image upload, deletion, and URL generation for product photos.
"""
import os
import uuid
from typing import Optional, Tuple
import httpx
from datetime import datetime

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BUCKET_NAME = "product-images"


def get_storage_url() -> str:
    """Get the Supabase storage API URL."""
    return f"{SUPABASE_URL}/storage/v1"


def get_public_url(file_path: str) -> str:
    """Generate public URL for an uploaded file."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{file_path}"


async def upload_product_image(
    product_id: str,
    file_bytes: bytes,
    filename: str,
    content_type: str = "image/jpeg"
) -> Tuple[bool, str, Optional[str]]:
    """
    Upload a product image to Supabase Storage.
    
    Args:
        product_id: The product ID to associate with the image
        file_bytes: Raw image bytes
        filename: Original filename
        content_type: MIME type of the image
    
    Returns:
        Tuple of (success, message, public_url or None)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False, "Supabase not configured", None
    
    # Generate unique filename to prevent collisions
    ext = filename.split(".")[-1] if "." in filename else "jpg"
    unique_filename = f"{product_id}/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
    
    storage_url = f"{get_storage_url()}/object/{BUCKET_NAME}/{unique_filename}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",  # Overwrite if exists
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                storage_url,
                content=file_bytes,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                public_url = get_public_url(unique_filename)
                return True, "Image uploaded successfully", public_url
            else:
                error_detail = response.text
                return False, f"Upload failed: {error_detail}", None
                
    except httpx.TimeoutException:
        return False, "Upload timed out - file may be too large", None
    except Exception as e:
        return False, f"Upload error: {str(e)}", None


async def delete_product_image(image_url: str) -> Tuple[bool, str]:
    """
    Delete a product image from Supabase Storage.
    
    Args:
        image_url: The public URL of the image to delete
    
    Returns:
        Tuple of (success, message)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False, "Supabase not configured"
    
    # Extract file path from URL
    # URL format: {SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}
    try:
        path_start = image_url.find(f"/public/{BUCKET_NAME}/")
        if path_start == -1:
            return False, "Invalid image URL format"
        
        file_path = image_url[path_start + len(f"/public/{BUCKET_NAME}/"):]
        
        storage_url = f"{get_storage_url()}/object/{BUCKET_NAME}/{file_path}"
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(storage_url, headers=headers)
            
            if response.status_code in [200, 204]:
                return True, "Image deleted successfully"
            else:
                return False, f"Delete failed: {response.text}"
                
    except Exception as e:
        return False, f"Delete error: {str(e)}"


async def ensure_bucket_exists() -> Tuple[bool, str]:
    """
    Ensure the product-images bucket exists in Supabase Storage.
    Creates it if it doesn't exist.
    
    Returns:
        Tuple of (success, message)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False, "Supabase not configured"
    
    bucket_url = f"{get_storage_url()}/bucket/{BUCKET_NAME}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Check if bucket exists
            response = await client.get(bucket_url, headers=headers)
            
            if response.status_code == 200:
                return True, "Bucket already exists"
            
            # Create bucket if it doesn't exist
            create_url = f"{get_storage_url()}/bucket"
            create_response = await client.post(
                create_url,
                headers=headers,
                json={
                    "id": BUCKET_NAME,
                    "name": BUCKET_NAME,
                    "public": True,
                }
            )
            
            if create_response.status_code in [200, 201]:
                return True, "Bucket created successfully"
            else:
                return False, f"Failed to create bucket: {create_response.text}"
                
    except Exception as e:
        return False, f"Bucket check error: {str(e)}"
