import os
import shutil

class SiteDeployer:
    def __init__(self, output_root, subdomain):
        self.output_dir = os.path.join(output_root, subdomain or "default")

    def deploy(self, rendered_pages):
        # Clean existing directory
        if os.path.exists(self.output_dir):
            shutil.rmtree(self.output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

        # Write HTML pages
        for path, content in rendered_pages.items():
            full_path = os.path.join(self.output_dir, path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)

        # Copy static assets
        static_src = os.path.join(os.path.dirname(__file__), "static")
        static_dst = os.path.join(self.output_dir, "static")
        if os.path.exists(static_src):
            shutil.copytree(static_src, static_dst, dirs_exist_ok=True)