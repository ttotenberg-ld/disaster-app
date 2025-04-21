import os
import httpx
import logging
import colorgram
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from urllib.parse import quote

# Load environment variables from .env file FIRST
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
LOGO_DEV_SECRET_KEY = os.getenv("LOGO_DEV_SECRET_KEY")
LOGO_DEV_PUBLIC_KEY = os.getenv("LOGO_DEV_PUBLIC_KEY")
LOGO_DEV_SEARCH_URL = "https://api.logo.dev/search"
DEFAULT_BRAND_COLOR = "#000000" # Used as fallback during color extraction

if not LOGO_DEV_SECRET_KEY or not LOGO_DEV_PUBLIC_KEY:
    logger.error("Error: LOGO_DEV_SECRET_KEY or LOGO_DEV_PUBLIC_KEY not found.")

app = FastAPI(title="Config API")

# --- Helper Function for Color Extraction --- 
async def extract_primary_color(image_url: str) -> Optional[str]:
    """Fetches an image and extracts the most dominant color."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, timeout=5.0, follow_redirects=True)
            response.raise_for_status()

            # Ensure it's an image
            content_type = response.headers.get("content-type", "").lower()
            if not content_type.startswith("image/"):
                logger.warning(f"URL did not point to an image: {image_url}")
                return None

            image_bytes = await response.aread()
            img = Image.open(BytesIO(image_bytes))
            # Ensure image is RGB for colorgram
            if img.mode != 'RGB':
                 img = img.convert('RGB')

            colors = colorgram.extract(img, 1) # Extract the single most dominant color

            if colors:
                dominant_color = colors[0].rgb
                hex_color = f"#{dominant_color.r:02x}{dominant_color.g:02x}{dominant_color.b:02x}"
                logger.info(f"Extracted color {hex_color} from {image_url}")
                return hex_color
            else:
                logger.warning(f"Could not extract colors from {image_url}")
                return None

    except httpx.RequestError as exc:
        logger.error(f"Failed to fetch image {image_url} for color extraction: {exc}")
        return None
    except Exception as exc:
        logger.error(f"Failed to extract color from image {image_url}: {exc}")
        return None

# --- API Endpoints --- 
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/search-brands", response_model=List[Dict[str, Any]])
async def search_brands(q: str = Query(..., min_length=1)):
    """Searches brands, fetches logos, extracts primary color, returns proxied logo URL."""
    if not LOGO_DEV_SECRET_KEY or not LOGO_DEV_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="API keys not configured")

    headers = {"Authorization": f"Bearer {LOGO_DEV_SECRET_KEY}"}
    params = {"q": q}
    logger.info(f"Searching brands with query: {q}")

    processed_results = []
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(LOGO_DEV_SEARCH_URL, headers=headers, params=params, timeout=10.0)
            response.raise_for_status()
            search_results = response.json()
            logger.info(f"Found {len(search_results)} results from logo.dev search for '{q}'")

            for item in search_results:
                domain = item.get("domain")
                if domain:
                    # 1. Construct direct logo URL for fetching/analysis
                    direct_logo_url = f"https://img.logo.dev/{domain}?token={LOGO_DEV_PUBLIC_KEY}"

                    # 2. Extract primary color from the direct URL
                    primary_color = await extract_primary_color(direct_logo_url)

                    # 3. Construct proxied logo URL for frontend use
                    proxied_logo_url = f"http://localhost:8001/api/proxy-image?url={quote(direct_logo_url)}"

                    processed_results.append({
                        "name": item.get("name"),
                        "domain": domain,
                        "logo_url": proxied_logo_url, # Use proxied URL
                        "primaryColor": primary_color or DEFAULT_BRAND_COLOR # Use extracted or fallback color
                    })
                else:
                     # Handle items without a domain if necessary
                     logger.warning(f"Search result item missing domain: {item.get('name')}")

            logger.info(f"Returning {len(processed_results)} processed results for query '{q}'")
            return processed_results

        except httpx.RequestError as exc:
            logger.error(f"Error calling logo.dev search API: {exc}", exc_info=True)
            raise HTTPException(status_code=503, detail=f"Error contacting logo search service: {exc}")
        except Exception as exc:
            logger.error(f"Unexpected error during brand search: {exc}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error during brand search")

@app.get("/api/proxy-image")
async def proxy_image(url: str):
    """Proxies image requests to avoid browser CORS issues."""
    # Basic validation to prevent open proxy abuse
    if not url or not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL")
    # Restrict to expected domain if necessary (optional but recommended)
    # from urllib.parse import urlparse
    # parsed_url = urlparse(url)
    # if parsed_url.netloc != 'img.logo.dev':
    #     raise HTTPException(status_code=400, detail="URL not allowed")

    async with httpx.AsyncClient() as client:
        try:
            # Use GET request for images
            response = await client.get(url, timeout=10.0, follow_redirects=True)
            response.raise_for_status() # Check for HTTP errors

            # Check content type - only proxy images
            content_type = response.headers.get("content-type", "").lower()
            if not content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="URL does not point to a valid image")

            # Return the image content with the original content type
            return Response(
                content=response.content,
                media_type=content_type
            )
        except httpx.RequestError as exc:
            print(f"Error proxying image {url}: {exc}")
            raise HTTPException(status_code=502, detail=f"Failed to fetch image from origin: {exc}")
        except HTTPException as http_exc: # Re-raise our own validation errors
            raise http_exc
        except Exception as exc:
            print(f"Unexpected error proxying image {url}: {exc}")
            raise HTTPException(status_code=500, detail="Internal server error during image proxy")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Config API (Search/Proxy) is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 