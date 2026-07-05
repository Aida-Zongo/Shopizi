import json
import urllib.request
import urllib.error

class DataFetcher:
    def __init__(self, api_url, api_key):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key

    def _get(self, endpoint):
        url = f"{self.api_url}{endpoint}"
        req = urllib.request.Request(url, headers={"X-Internal-Api-Key": self.api_key})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
                # Handle envelope format: { "success": true, "data": { ... } }
                return data.get("data", data)  # Support both {data: {...}} and raw dict
        except urllib.error.HTTPError as e:
            print(f"[Fetcher] HTTP Error {e.code}: {e.reason}")
            return None
        except Exception as e:
            print(f"[Fetcher] Error: {e}")
            return None

    def fetch_all(self, shop_id):
        """Fetch shop data, products and categories from unified public endpoint."""
        data = self._get(f"/shops/{shop_id}/public")
        if not data:
            print(f"[Fetcher] Failed to fetch shop data for {shop_id}")
            return None, [], []

        # Extract entities (endpoint returns { shop, products, categories })
        shop = data.get("shop") if isinstance(data, dict) else data
        products = data.get("products", []) if isinstance(data, dict) else []
        categories = data.get("categories", []) if isinstance(data, dict) else []

        return shop, products, categories
