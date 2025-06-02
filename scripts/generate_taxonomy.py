#!/usr/bin/env python3
"""Generate simple SKOS taxonomy from ontologies index."""

import json
import os

INDEX = os.path.join('docs', 'ontologies.json')
OUTPUT = os.path.join('docs', 'taxonomy.ttl')

PREFIX = "http://example.org/taxonomy#"


def main():
    with open(INDEX, 'r') as f:
        data = json.load(f)

    types = sorted(set((entry.get('file_type') or entry['type']) for entry in data))

    with open(OUTPUT, 'w') as f:
        f.write('@prefix skos: <http://www.w3.org/2004/02/skos/core#> .\n\n')
        f.write(f'<{PREFIX}OntologyTypes> a skos:ConceptScheme ;\n')
        f.write('    skos:prefLabel "Ontology File Types" .\n\n')
        for t in types:
            cid = t.replace(' ', '_')
            f.write(f'<{PREFIX}{cid}> a skos:Concept ;\n')
            f.write(f'    skos:prefLabel "{t}" ;\n')
            f.write(f'    skos:inScheme <{PREFIX}OntologyTypes> .\n\n')


if __name__ == "__main__":
    main()
