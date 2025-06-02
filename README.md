# Ontologies for projects
3rd party ontologies useful for projects

## Website Generation

Run `scripts/generate_index.py` to produce `docs/ontologies.json`. The `docs` directory hosts a simple index that can be served via GitHub Pages.

A GitHub Actions workflow in `.github/workflows/update-pages.yml` automatically regenerates `docs/ontologies.json` and commits it when changes are pushed to `main`.

## Advanced Review

The optional workflow `advanced-review.yml` can be triggered manually to analyse
ontology files and fill in any missing metadata in `docs/ontologies.json` such
as primary and secondary use or relevance for project management. It runs
`scripts/advanced_review.py` and commits the updated index back to the
repository.
