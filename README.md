# Ontologies for projects
3rd party ontologies useful for projects. All ontology files are stored in the
`ontologies` directory.

Browse the [public catalogue](https://lawrencerowland.github.io/Ontologies-for-projects/)
or return to the [Library](https://lawrencerowland.github.io/library.html).
This is a working reference collection: the stored files include older versions,
saved HTML pages and modelling fragments. Catalogue descriptions are working
notes, not an ontology validation or a recommendation for production use.

## Catalogue links and checks

The website is served from `docs/`; the source files remain in root `ontologies/`.
Each card opens the stored file from `raw.githubusercontent.com` and offers a
separate GitHub source view. Paths are encoded per segment, including spaces and
punctuation. The browser may display or download the file according to its type.
Do not use `../ontologies/...` on the website: it escapes the project Pages URL,
and the root source directory is not part of the published `docs/` folder.

Run `node --test tests/catalogue.test.cjs` to check every catalogue path and file,
URL construction, search/filter intersections, reset, retained metadata and
loading failures. The same checks run for pull requests and pushes to `main`.
These are catalogue checks, not RDF parsing, import resolution or semantic
validation. The change deliberately preserves all 48 existing records and their
original source bytes.

## Website Generation

Run `scripts/generate_index.py` to produce `docs/ontologies.json`. The `docs` directory hosts a simple index that can be served via GitHub Pages.

Use the `generate-index` workflow to regenerate `docs/ontologies.json` when needed. This workflow can be triggered manually and commits the updated file back to the repository. The `update-pages` workflow no longer modifies the index automatically.

## Advanced Review

The optional workflow `advanced-review.yml` can be triggered manually to analyse
ontology files and fill in any missing metadata in `docs/ontologies.json` such
as primary and secondary use or relevance for project management. It runs
`scripts/advanced_review.py` and commits the updated index back to the
repository.

`advanced_review.py` also assigns basic domain and task tags (e.g. Construction,
Safety, Risk Management) based on keywords found in each ontology. These tags
appear in `docs/ontologies.json` and let the web page filter ontologies by
domain.

## Taxonomy Generation

Run `scripts/generate_taxonomy.py` after the index is updated to rebuild
`docs/taxonomy.ttl` with SKOS concepts for each ontology file type. This keeps
the taxonomy in sync with the available ontologies.
