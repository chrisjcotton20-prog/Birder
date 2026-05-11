# Continental Census

A field-journal-styled PWA that tracks your eBird life list against the 774
native, regularly-occurring bird species of the ABA Area (US + Canada + Hawaii,
filtered to Codes 1–3 with established exotics removed).

Designed to be installed to your iPhone home screen as a PWA.

---

## Running locally

```bash
npm install
npm run dev
```

Then open the printed URL in a browser. Use the file picker to load your
`MyEBirdData.csv` (download it from My eBird → Download My Data on
[ebird.org](https://ebird.org)).

## Building for production

```bash
npm run build
npm run preview   # to test the production build locally
```

The built site goes to `dist/`. It's a fully static site — drop it on any
static host.

---

## Deploying to Vercel (recommended)

The fastest path:

1. Push this folder to a new GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Vercel auto-detects Vite and deploys. No config needed.
4. You'll get a URL like `your-app.vercel.app`.

Every `git push` to `main` redeploys automatically. The PWA service worker
takes care of updates — the next time the app is opened on your phone, it
checks for a new version in the background and swaps in.

### Alternative: Netlify

Same flow at [netlify.com](https://netlify.com). Auto-detects Vite. Same
result.

---

## Installing on iPhone

Once deployed:

1. Open the URL in **Safari** (not Chrome — only Safari can install PWAs on iOS).
2. Tap the Share button (square with arrow).
3. Tap **Add to Home Screen**.
4. Confirm. The app icon appears on your home screen.
5. Tap it. Opens in standalone mode (no Safari chrome). Your data is stored
   locally in IndexedDB and persists across launches.

### Importing your eBird CSV on iPhone

eBird has no API for personal data, so the CSV upload is the only path. The
flow is short:

1. On a computer or in mobile Safari, go to
   [ebird.org/downloadMyData](https://ebird.org/downloadMyData) and request
   your data.
2. Within a few minutes you'll get an email with a download link.
3. On your iPhone, tap the link in the email — iOS will offer to download
   the `.csv` file. Save it (the default is the Downloads folder in Files).
4. Open the Census app from your home screen.
5. Tap **Upload CSV** (or **Re-upload CSV** if it's not your first time).
6. The iOS file picker opens. Tap **Browse**, then **Downloads**, and pick
   the CSV. Or — even faster — the picker shows recent files at the top,
   including the file you just downloaded.
7. Done. The app parses it locally on-device, counts your native US species,
   and stores the result.

iOS Safari doesn't currently support the Web Share Target or File Handling
APIs for PWAs, so there's no way to "open in Census" directly from Mail.
The file-picker route is the cleanest available workflow. Android Chrome
*does* support file handlers, so on Android tapping the CSV launches the
app directly.

---

## Why 774?

See the **About the 774?** drawer inside the app for the full derivation,
or read [https://www.aba.org/aba-checklist/](https://www.aba.org/aba-checklist/)
and [https://www.aba.org/aba-area-introduced-species/](https://www.aba.org/aba-area-introduced-species/)
for the source data.

Short version: ABA Codes 1–3 (regular & rare-but-annual) minus the 52
established exotics on the ABA Introduced Species list = 774 native,
regularly-occurring species.

---

## Features

- **774-species life list tracker** with progress bar and stats
- **Browse all species** grouped by family in ABA taxonomic order, checkboxes show what you've seen
- **Sightings heatmap** — hexbin density map showing where you've birded across the US (lower 48, Alaska, Hawaii)
- All data stored locally in IndexedDB; nothing uploaded anywhere

## Tech notes

- **Vite** for build and dev server
- **React 18** for the UI
- **Tailwind** for utility classes
- **vite-plugin-pwa** for service worker + manifest
- **IndexedDB** (via `src/lib/storage.js`) for persistent local storage
- **PapaParse** for parsing the eBird CSV
- **lucide-react** for icons
- **d3-geo + d3-hexbin + topojson-client + us-atlas** for the sightings map (no external map tile server required — the US states topojson is bundled)

The 774-species master list and family taxonomy are embedded in `src/App.jsx`
as compile-time constants — no external data dependencies at runtime.

All eBird data stays on your device. Nothing is uploaded anywhere.
