# Recipe Storage — GitHub Pages edition

A personal recipe box that runs entirely for free. No accounts, no API keys, no AI usage.

## What's in here

| File | What it does |
|---|---|
| `index.html` | The whole app — one self-contained file. |
| `recipes-db.json` | The built-in recipe database the search tab looks through. Add your own entries to it! |

## How it works (all free)

- **Your saved recipes, favorites, and theme** live in your browser's localStorage. They persist between visits on the same browser/device. No server involved.
- **The search tab** looks in two places, both free:
  1. `recipes-db.json` — the database bundled in this repo (works even offline)
  2. [TheMealDB](https://www.themealdb.com) — a free public recipe API with photos, no key or account required
- **Photos** you upload are compressed and stored in localStorage; photos from TheMealDB are linked directly.

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `recipe-storage`).
2. Upload `index.html` and `recipes-db.json` to the repository root.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", pick your branch (usually `main`) and the `/ (root)` folder, then save.
5. Wait a minute, then visit `https://<your-username>.github.io/recipe-storage/`.

That's it — no build step needed.

## Growing the built-in database

Open `recipes-db.json` and add entries following this shape:

```json
{
  "name": "Recipe Name",
  "type": "Dinner",
  "description": "One short sentence.",
  "ingredients": ["1 cup thing", "2 tbsp other thing"],
  "steps": ["Do this first.", "Then do this."]
}
```

`type` must be `"Breakfast"`, `"Lunch"`, `"Dinner"`, or `""` (empty shows the recipe in every tab). Commit the change and GitHub Pages redeploys automatically.

## Good to know

- localStorage is per-browser and per-device: recipes saved on your phone won't appear on your laptop. Total storage is about 5 MB, which is plenty of recipes but means very large photo collections can eventually fill up — the app compresses photos to keep them small.
- Clearing your browser data for the site will erase saved recipes, so export anything precious into `recipes-db.json` if you want it permanent.
