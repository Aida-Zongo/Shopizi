const { pool } = require('./src/db/pool');

async function cleanShops() {
  try {
    console.log('Cleaning test shops...');
    const deleteProducts = await pool.query(
      "DELETE FROM products WHERE shop_id IN (SELECT id FROM shops WHERE name ILIKE '%test%' OR description IS NULL OR description = 'null')"
    );
    console.log('Deleted products:', deleteProducts.rowCount);
    const deleteShops = await pool.query(
      "DELETE FROM shops WHERE name ILIKE '%test%' OR description IS NULL OR description = 'null'"
    );
    console.log('Deleted shops:', deleteShops.rowCount);
    await pool.end();
    console.log('Cleanup completed successfully.');
  } catch (err) {
    console.error('Error during cleanup:', err.message);
    process.exit(1);
  }
}

cleanShops();
