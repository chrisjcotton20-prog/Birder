// Web Share Target handler (imported into the workbox-generated service worker).
//
// When the user shares the eBird export to Birder from their email/file app, the
// OS sends a multipart POST to /share-target. A service worker is the only place
// that POST can be read, so we intercept it here, stash the file in the Cache
// API, and redirect the client to the app. The app reads the cached file on load
// (see the share-target effect in App.jsx) and runs it through the normal import.
const BIRDER_SHARE_CACHE = 'birder-share';
const BIRDER_SHARE_KEY = '/__shared-import';

self.addEventListener('fetch', (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return;

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData();
        // Accept whichever field the platform used; "file" is what the manifest declares.
        let file = formData.get('file');
        if (!file || typeof file === 'string') {
          for (const value of formData.values()) {
            if (value && typeof value !== 'string') { file = value; break; }
          }
        }
        if (file && typeof file !== 'string') {
          const cache = await caches.open(BIRDER_SHARE_CACHE);
          await cache.put(
            BIRDER_SHARE_KEY,
            new Response(file, {
              headers: {
                'content-type': file.type || 'application/octet-stream',
                'x-filename': encodeURIComponent(file.name || 'shared'),
              },
            })
          );
        }
      } catch {
        // fall through to redirect regardless; the app simply won't find a file
      }
      return Response.redirect('/?shared=1', 303);
    })()
  );
});
