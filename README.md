# Ontologies for projects
3rd party ontologies useful for projects. All ontology files are stored in the
`ontologies` directory.

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
