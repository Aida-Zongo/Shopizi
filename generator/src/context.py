"""Build structured context for Jinja2 templates."""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class ContextBuilder:
    def build(self, shop_data: dict, products: list, categories: list) -> Dict[str, Any]:
        # Normalize products
        normalized_products = []
        for p in products:
            np = {
                "id": str(p.get("id", "")),
                "name": p.get("name", "Produit"),
                "slug": p.get("slug", ""),
                "price": float(p.get("price", 0)),
                "currency": p.get("currency", "XOF"),
                "stock": int(p.get("stock", 0)),
                "description": p.get("description", ""),
                "image_url": p.get("image_url"),
                "images": p.get("images", []),
                "category_id": p.get("category_id"),
                "featured": bool(p.get("featured", False)),
                "variants": p.get("variants", []),
            }
            normalized_products.append(np)

        # Normalize categories
        normalized_categories = []
        for c in categories:
            nc = {
                "id": str(c.get("id", "")),
                "name": c.get("name", "Categorie"),
                "slug": c.get("slug", ""),
                "parent_id": c.get("parent_id"),
                "product_count": int(c.get("product_count", 0)),
            }
            normalized_categories.append(nc)

        # Build theme CSS variables
        primary_color = shop_data.get("primary_color", "#007A38")
        accent_color = shop_data.get("accent_color", "#FFB627")

        context = {
            "shop": {
                "id": str(shop_data.get("id", "")),
                "name": shop_data.get("name", "Ma Boutique"),
                "subdomain": shop_data.get("subdomain", "shop"),
                "description": shop_data.get("description", ""),
                "phone": shop_data.get("phone", ""),
                "address": shop_data.get("address", ""),
                "theme": shop_data.get("theme", "default"),
                "domain": f"{shop_data.get('subdomain', 'shop')}.shopizi.bf",
                "whatsapp_link": f"https://wa.me/{shop_data.get('phone', '').replace('+', '')}" if shop_data.get("phone") else None,
            },
            "theme": {
                "primary_color": primary_color,
                "accent_color": accent_color,
                "css_variables": self._build_css_vars(primary_color, accent_color),
            },
            "products": normalized_products,
            "categories": normalized_categories,
            "featured_products": [p for p in normalized_products if p["featured"]],
            "meta": {
                "title": f"{shop_data.get('name', 'Boutique')} - Shopizi",
                "description": shop_data.get("description", "") or f"Decouvrez les produits de {shop_data.get('name', 'notre boutique')}",
            },
        }
        return context

    @staticmethod
    def _build_css_vars(primary: str, accent: str) -> str:
        """Generate a CSS :root block from brand colors."""
        # Very simple approach: use the provided colors directly
        return f""":root {{
  --color-primary: {primary};
  --color-accent: {accent};
  --color-primary-light: {primary};
}}"""
