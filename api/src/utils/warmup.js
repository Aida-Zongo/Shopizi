const logger = require('../config/logger');

// Render (plan free) met le service en veille après 15 min SANS trafic entrant.
// On ping à 14 min pour réarmer le compteur avant la mise en veille.
const INTERVAL_MS = 14 * 60 * 1000;

/**
 * URL à pinger pour garder le service éveillé.
 *
 * IMPORTANT : le ping DOIT passer par l'URL publique. Render décide la mise en
 * veille au niveau de son routeur, en observant le trafic ENTRANT. Une requête
 * vers http://localhost:PORT ne sort jamais du conteneur, le routeur ne la voit
 * donc jamais et le compteur d'inactivité n'est pas réarmé : le cold start
 * surviendrait quand même.
 *
 * RENDER_EXTERNAL_URL est injectée automatiquement par Render.
 */
function resolveTarget(port) {
  const base = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (base) return `${base.replace(/\/$/, '')}/health`;
  return `http://localhost:${port}/health`;
}

function start(port) {
  const target = resolveTarget(port);

  if (target.includes('localhost')) {
    logger.warn(
      'Warmup: aucune URL publique (RENDER_EXTERNAL_URL / BACKEND_URL) détectée. '
      + 'Ping sur localhost — sans effet contre la mise en veille Render.'
    );
  }

  const timer = setInterval(async () => {
    const startedAt = Date.now();
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(30000) });
      logger.info(`Warmup ping ${res.status} en ${Date.now() - startedAt} ms`);
    } catch (err) {
      logger.warn(`Warmup ping échoué: ${err.message}`);
    }
  }, INTERVAL_MS);

  // Ne pas retenir l'event loop : l'arrêt gracieux (SIGTERM) reste immédiat.
  timer.unref();

  logger.info(`Warmup actif: ping ${target} toutes les 14 min`);
  return timer;
}

module.exports = { start };
