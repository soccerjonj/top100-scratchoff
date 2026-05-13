# Raw list inputs

Drop two plain-text files here, one per list, **one "Title (YYYY)" per line in rank order**:

- `imdb-top-100.txt` — the 100 titles from your scratch-off poster
- `letterboxd-top-500.txt` — generate this automatically with `npm run build-lists -- --scrape-letterboxd`

Example:

```
The Godfather (1972)
The Shawshank Redemption (1994)
Schindler's List (1993)
```

Then run:

```
TMDB_API_KEY=... npm run build-lists
```

The script writes `src/data/imdb-top-100.json` and `src/data/letterboxd-top-500.json`.
