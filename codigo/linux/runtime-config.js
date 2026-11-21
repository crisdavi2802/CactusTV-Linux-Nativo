/* Cactus TV Linux — configuración de ejecución.
 * Sustituye al runtime-config.js de Tizen. No es código de Windows ni de Android:
 * mantiene el contrato de la app de television (`CACTUS_RUNTIME`) y solo indica
 * que en Linux se usa el modo directo con los catalogos locales incluidos. */
window.CACTUS_RUNTIME = {
  apiBase: '',
  demoOnly: false,
  direct: true,
  catalogSource: 'xuper',
  linux: true,
  /* Sincronizacion de catalogo en segundo plano: el catálogo de 27 MB ya va
   * incluido, así que se retrasa y se espacia para no quemar CPU al arrancar. */
  syncStartDelayMs: 5 * 60 * 1000,
  syncIntervalMs: 30 * 60 * 1000,
  syncIdleMs: 60 * 1000
};
