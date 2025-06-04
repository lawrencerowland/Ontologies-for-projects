#!/usr/bin/env python3
"""Fill missing ontology metadata in docs/ontologies.json."""

import json
import os
import re

# keywords to infer domain/task tags
TAG_KEYWORDS = {
    'Construction': ['construction', 'building', 'architecture', 'zoning', 'land use'],
    'IT': ['software', 'information technology', 'computer', 'network', 'it project'],
    'Safety': ['safety', 'hazard'],
    'Risk Management': ['risk'],
    'Schedule': ['schedule', 'gantt', 'milestone', 'timeline'],
    'Quality Assurance': ['quality', 'testing', 'validation', 'verification'],
    'Work Breakdown Structure': ['work breakdown structure', 'wbs']
}

INDEX_PATH = os.path.join('docs', 'ontologies.json')

# heuristics for extracting metadata

def extract_name(content, fallback):
    label_match = re.search(r'rdfs:label\s+["\']([^"\']+)["\']', content)
    if label_match:
        return label_match.group(1)
    title_match = re.search(r'dc:title\s+["\']([^"\']+)["\']', content)
    if title_match:
        return title_match.group(1)
    return fallback

def extract_description(content):
    desc_match = re.search(r'(?:rdfs:comment|dc:description|dct:description)\s+["\']([^"\']+)["\']', content, re.I)
    if desc_match:
        return desc_match.group(1)
    return ''

def infer_relevance(text):
    ltext = text.lower()
    if 'project management' in ltext:
        return 'high'
    if 'project' in ltext and 'management' in ltext:
        return 'medium'
    return 'low'

def infer_use(description):
    if not description:
        return '', ''
    parts = description.split('.')
    primary = parts[0].strip()
    secondary = '.'.join(p.strip() for p in parts[1:] if p.strip())
    return primary, secondary

def detect_tags(text):
    tags = []
    ltext = text.lower()
    for tag, kws in TAG_KEYWORDS.items():
        for kw in kws:
            if re.search(re.escape(kw), ltext):
                tags.append(tag)
                break
    return sorted(set(tags))

def process_file(path, metadata):
    try:
        with open(path, 'r', errors='ignore') as f:
            content = f.read(5000)
    except Exception:
        content = ''
    metadata.setdefault('file_type', os.path.splitext(path)[1].lstrip('.').lower() or 'other')

    if not metadata.get('name'):
        metadata['name'] = extract_name(content, os.path.splitext(os.path.basename(path))[0])

    desc = extract_description(content)
    if not metadata.get('description'):
        metadata['description'] = desc
    primary, secondary = infer_use(desc)
    if not metadata.get('primary_use'):
        metadata['primary_use'] = primary
    if not metadata.get('secondary_use'):
        metadata['secondary_use'] = secondary
    if not metadata.get('relevance'):
        metadata['relevance'] = infer_relevance(content)

    if not metadata.get('tags'):
        meta_text = ' '.join([metadata.get('name', ''), metadata.get('description', ''), content])
        metadata['tags'] = detect_tags(meta_text)

    return metadata

def main():
    if not os.path.exists(INDEX_PATH):
        raise FileNotFoundError(INDEX_PATH)

    with open(INDEX_PATH, 'r') as f:
        index = json.load(f)

    for entry in index:
        file_path = entry.get('file')
        if not file_path:
            continue
        entry = process_file(file_path, entry)

    with open(INDEX_PATH, 'w') as f:
        json.dump(index, f, indent=2)

if __name__ == '__main__':
    main()
