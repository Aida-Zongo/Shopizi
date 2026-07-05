from datetime import datetime
import os

def generate_sitemap(shop_data, base_dir, base_url):
    """Generate a sitemap.xml for the generated site."""
    pages = ["", "produits.html", "a-propos.html"]

    # Add product detail pages
    for product in shop_data.get("products", []):
        slug = product.get("slug")
        if slug:
            pages.append(f"produits/{slug}.html")

    sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    now = datetime.now().strftime("%Y-%m-%d")
    for page in pages:
        loc = f"{base_url}/{page}"
        sitemap_content += "  <url>\n"
        sitemap_content += f"    <loc>{loc}</loc>\n"
        sitemap_content += f"    <lastmod>{now}</lastmod>\n"
        sitemap_content += "    <changefreq>weekly</changefreq>\n"
        sitemap_content += "    <priority>0.8</priority>\n"
        sitemap_content += "  </url>\n"

    sitemap_content += "</urlset>\n"

    sitemap_path = os.path.join(base_dir, "sitemap.xml")
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write(sitemap_content)

    return sitemap_path
