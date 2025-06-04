#!/usr/bin/env python3
"""Generate ontology index for GitHub pages."""

import os
import re
import json

# file extensions to include
EXTENSIONS = {'.ttl', '.owl', '.rdf', '.json', '.html', '.txt', '.xml'}

INDEX_PATH = os.path.join('docs', 'ontologies.json')

def extract_metadata(path):
    metadata = {
        'file': path,
        'type': os.path.splitext(path)[1].lstrip('.').lower()
    }
    try:
        with open(path, 'r', errors='ignore') as f:
            content = f.read(4096)
    except Exception:
        content = ''

    label_match = re.search(r'rdfs:label\s+["\']([^"\']+)["\']', content)
    if label_match:
        metadata['name'] = label_match.group(1)
    else:
        metadata['name'] = os.path.splitext(os.path.basename(path))[0]

    desc_match = re.search(r'(?:rdfs:comment|dc:description|dct:description)\s+["\']([^"\']+)["\']', content, re.I)
    if desc_match:
        metadata['description'] = desc_match.group(1)
    else:
        metadata['description'] = ''

    return metadata

ONT_DIR = 'ontologies'


def load_existing():
    """Return a mapping of existing metadata keyed by file path."""
    if not os.path.exists(INDEX_PATH):
        return {}
    try:
        with open(INDEX_PATH, 'r') as f:
            data = json.load(f)
        return {entry.get('file'): entry for entry in data}
    except Exception:
        return {}

def main():
    existing = load_existing()
    index = []
    for fname in sorted(os.listdir(ONT_DIR)):
        ext = os.path.splitext(fname)[1].lower()
        if ext in EXTENSIONS:
            path = os.path.join(ONT_DIR, fname)
            meta = extract_metadata(path)
            old = existing.get(path, {})
            for k, v in old.items():
                meta.setdefault(k, v)
            index.append(meta)
    os.makedirs('docs', exist_ok=True)
    with open('docs/ontologies.json', 'w') as f:
        json.dump(index, f, indent=2)

if __name__ == '__main__':
    main()
