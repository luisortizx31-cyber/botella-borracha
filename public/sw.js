// Deja la app instalable y funcionando (con lo último visto) sin
// internet. Los archivos de Vite llevan un hash en el nombre que
// cambia en cada build, así que no hace falta una lista fija - alcanza
// con cachear lo que se va pidiendo.
const CACHE = 'botella-borracha-v1'
const RAIZ = '/botella-borracha/'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  // Navegación (abrir la app): red primero, y si no hay internet cae
  // a la página cacheada la última vez que sí hubo.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(RAIZ, copia))
          return res
        })
        .catch(() => caches.match(RAIZ))
    )
    return
  }

  // Resto (JS/CSS/íconos): cache primero para que cargue al toque, y
  // de fondo pide la red para tener la próxima vez al día.
  e.respondWith(
    caches.match(req).then((guardado) => {
      const red = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return res
        })
        .catch(() => guardado)
      return guardado || red
    })
  )
})
