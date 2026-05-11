// analytics.js — wrapper PostHog per Bolly
// Usa window.posthog (caricato via CDN in index.html)

function ph() {
  return window.posthog
}

/** Identifica l'utente dopo il login */
export function identifyUser(userId, properties = {}) {
  ph()?.identify(userId, properties)
}

/** Traccia un evento custom */
export function track(eventName, properties = {}) {
  ph()?.capture(eventName, properties)
}

/** Traccia cambio schermata (pageview virtuale) */
export function trackScreen(screenName) {
  ph()?.capture('$pageview', { $current_url: `https://getbolly.app/${screenName}` })
}

/** Reset al logout (disassocia utente) */
export function resetAnalytics() {
  ph()?.reset()
}

/** Imposta proprietà utente persistenti */
export function setUserProperties(properties) {
  ph()?.setPersonProperties(properties)
}
