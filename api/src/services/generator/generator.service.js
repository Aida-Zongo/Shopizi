const { spawn } = require('child_process');
const path = require('path');
const { query } = require('../../db/pool');
const { query: dbQuery } = require('../../db/pool');
const config = require('../../config/index');
const logger = require('../../config/logger');

/**
 * Queue a site generation job and execute it.
 * @param {string} shopId - Shop UUID
 * @param {string} trigger - What triggered the generation
 */
async function queueGeneration(shopId, trigger) {
  // Create log entry
  const log = await dbQuery(
    `INSERT INTO site_generation_logs (shop_id, trigger, status)
     VALUES ($1, $2, 'queued') RETURNING id`,
    [shopId, trigger]
  );
  const logId = log.rows[0].id;

  try {
    await generateNow(shopId, logId);
  } catch (err) {
    await dbQuery(
      `UPDATE site_generation_logs SET status = 'failed', error_message = $1 WHERE id = $2`,
      [err.message, logId]
    );
    logger.error(`Site generation failed for shop ${shopId}:`, err);
    throw err;
  }
}

/**
 * Immediately execute the Python generator.
 */
async function generateNow(shopId, logId) {
  const startTime = Date.now();

  // Update status to running
  await dbQuery(
    `UPDATE site_generation_logs SET status = 'running' WHERE id = $1`,
    [logId]
  );

  return new Promise((resolve, reject) => {
    // Get shop subdomain for output path
    (async () => {
      const shopResult = await dbQuery('SELECT subdomain FROM shops WHERE id = $1', [shopId]);
      const subdomain = shopResult.rows[0]?.subdomain || shopId;
      const outputPath = path.join(config.generator.siteOutputRoot, subdomain);

      // Spawn Python process
      const pythonScript = path.resolve(__dirname, '../../../../generator/src/main.py');
      const args = [pythonScript, shopId, '--api-url', `http://localhost:${config.server.port}/api/v1`, '--api-key', config.internalApiKey, '--output-root', config.generator.siteOutputRoot];

      const python = spawn(config.generator.pythonPath, args, {
        cwd: path.resolve(__dirname, '../../../../'), // Run from shopizi root
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });

      let stdoutData = '';
      let stderrData = '';

      python.stdout.on('data', (data) => {
        stdoutData += data.toString();
        logger.debug(`[Generator stdout]: ${data}`);
      });

      python.stderr.on('data', (data) => {
        stderrData += data.toString();
        logger.warn(`[Generator stderr]: ${data}`);
      });

      python.on('close', async (code) => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          await dbQuery(
            `UPDATE site_generation_logs SET status = 'success', duration_ms = $1, output_path = $2, completed_at = NOW() WHERE id = $3`,
            [duration, outputPath, logId]
          );
          logger.info(`Site generation completed for shop ${shopId} in ${duration}ms`);
          resolve({ success: true, duration, outputPath });
        } else {
          await dbQuery(
            `UPDATE site_generation_logs SET status = 'failed', duration_ms = $1, error_message = $2 WHERE id = $3`,
            [duration, `Process exited with code ${code}: ${stderrData || stdoutData}`, logId]
          );
          reject(new Error(`Generator exited with code ${code}: ${stderrData || stdoutData}`));
        }
      });

      python.on('error', async (err) => {
        await dbQuery(
          `UPDATE site_generation_logs SET status = 'failed', error_message = $1 WHERE id = $2`,
          [err.message, logId]
        );
        reject(err);
      });
    })();
  });
}

module.exports = { queueGeneration, generateNow };
