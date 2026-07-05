import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from datetime import datetime
import json

class SiteRenderer:
    def __init__(self, shop_data, products, categories):
        self.shop = shop_data
        self.products = products or []
        self.categories = categories or []
        self.env = Environment(
            loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')),
            autoescape=select_autoescape(['html', 'xml'])
        )

    def _build_context(self):
        wa_number = self.shop.get('whatsapp_number', '').replace('+', '')
        wa_message = f"Bonjour, je suis intéressé(e) par vos produits sur {self.shop.get('name', 'votre boutique')}"
        wa_link = f"https://wa.me/{wa_number}?text={wa_message}" if wa_number else "#"

        featured = [p for p in self.products if p.get('is_featured')] or self.products[:8]

        return {
            "shop": self.shop,
            "theme": {
                "primary_color": self.shop.get("primary_color", "#2D6A4F"),
                "secondary_color": self.shop.get("secondary_color", "#52B788"),
            },
            "wa_link": wa_link,
            "featured_products": featured,
            "all_products": self.products,
            "products_by_category": self._group_by_category(),
            "categories": self.categories,
            "site_meta": {
                "title": f"{self.shop.get('name', 'Boutique')} | Shopizi",
                "description": self.shop.get("description", "Boutique en ligne"),
                "url": f"https://{self.shop.get('subdomain', 'shop')}.shopizi.bf",
                "year": datetime.now().year,
            },
        }

    def _group_by_category(self):
        grouped = {}
        for p in self.products:
            cat_id = p.get("category_id") or "autres"
            if cat_id not in grouped:
                grouped[cat_id] = []
            grouped[cat_id].append(p)
        return grouped

    def render_all(self):
        ctx = self._build_context()
        pages = {}

        # Home page
        pages["index.html"] = self.env.get_template("home.html").render(**ctx)
        # Products catalog
        pages["produits.html"] = self.env.get_template("products.html").render(**ctx)
        # About
        pages["a-propos.html"] = self.env.get_template("about.html").render(**ctx)
        # 404
        pages["404.html"] = self.env.get_template("404.html").render(**ctx)
        # Product detail pages
        for product in self.products:
            slug = product.get("slug", str(product.get("id")))
            pages[f"produits/{slug}.html"] = self.env.get_template("product_detail.html").render(
                product=product, **{k: v for k, v in ctx.items() if k != "all_products"}
            )

        return pages, ctx

    def render_page(self, template_name, extra_ctx=None):
        ctx = self._build_context()
        if extra_ctx:
            ctx.update(extra_ctx)
        return self.env.get_template(template_name).render(**ctx)