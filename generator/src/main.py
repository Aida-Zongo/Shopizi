#!/usr/bin/env python3
"""
Shopizi Static Site Generator
Generates a complete mini-website for a given shop.
"""
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetcher import DataFetcher
from renderer import SiteRenderer
from deploy import SiteDeployer

def main():
    parser = argparse.ArgumentParser(description="Shopizi Static Site Generator")
    parser.add_argument("shop_id", help="Shop UUID or subdomain to generate")
    parser.add_argument("--api-url", default="http://localhost:3000/api/v1", help="API base URL")
    parser.add_argument("--api-key", default="", help="Internal API key")
    parser.add_argument("--output-root", default="/var/www/shops", help="Output directory")
    args = parser.parse_args()

    print(f"[Generator] Starting generation for shop: {args.shop_id}")

    # Fetch all data (unified endpoint)
    fetcher = DataFetcher(args.api_url, args.api_key)
    shop_data, products, categories = fetcher.fetch_all(args.shop_id)

    if not shop_data:
        print("[Generator] ERROR: Shop not found or API error")
        sys.exit(1)

    subdomain = shop_data.get("subdomain", args.shop_id)

    # Render site
    renderer = SiteRenderer(shop_data, products, categories)
    rendered_pages = renderer.render_all()

    # Deploy
    deployer = SiteDeployer(args.output_root, subdomain)
    deployer.deploy(rendered_pages)

    print(f"[Generator] SUCCESS: Site generated for {subdomain}")

if __name__ == "__main__":
    main()
