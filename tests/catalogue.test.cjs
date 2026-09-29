const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../docs/catalogue.js');
const root = path.resolve(__dirname, '..');
const records = JSON.parse(fs.readFileSync(path.join(root, 'docs/ontologies.json'), 'utf8'));
const response = data => ({ ok: true, json: async () => data });

// A small DOM boundary double: production DOM construction is also checked in browser QA.
class Node {
  constructor(tag = '') { this.tagName = tag; this.children = []; this.value = ''; this.listeners = {}; this.attributes = {}; }
  set textContent(value) { this.children = []; this.content = String(value); }
  get textContent() { return (this.content || '') + this.children.map(child => child.textContent).join(''); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.content = ''; this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  focus() { this.focused = true; }
  set innerHTML(value) { throw new Error('Catalogue data must not be parsed as HTML.'); }
}
function documentDouble() {
  const elements = Object.fromEntries(['filter', 'typeFilter', 'areaFilter', 'cards', 'resultCount', 'resetFilters'].map(id => [id, new Node()]));
  return { elements, getElementById: id => elements[id], createElement: tag => new Node(tag), createTextNode: text => { const node = new Node('#text'); node.textContent = text; return node; } };
}
function descendants(node) { return [node, ...node.children.flatMap(descendants)]; }

test('all 48 catalogue records have stored files and reversible raw/source URLs', () => {
  assert.equal(records.length, 48);
  assert.equal(new Set(records.map(record => record.file)).size, 48);
  for (const record of records) {
    assert.equal(api.safePath(record.file), record.file);
    assert.ok(fs.statSync(path.join(root, record.file)).isFile(), record.file);
    const urls = api.fileUrls(record.file);
    const raw = new URL(urls.raw), source = new URL(urls.source);
    assert.equal(raw.origin, 'https://raw.githubusercontent.com');
    assert.equal(source.origin, 'https://github.com');
    assert.equal(decodeURIComponent(raw.pathname), '/lawrencerowland/Ontologies-for-projects/main/' + record.file);
    assert.equal(decodeURIComponent(source.pathname), '/lawrencerowland/Ontologies-for-projects/blob/main/' + record.file);
    assert.equal(raw.search + raw.hash + source.search + source.hash, '');
  }
  assert.match(api.fileUrls('ontologies/2022 11 safety ontology.ttl').raw, /2022%2011%20safety%20ontology\.ttl$/);
  assert.match(api.fileUrls('ontologies/itpm_IssueConcepts(inwork).owl').raw, /Concepts%28inwork%29\.owl$/);
  assert.match(api.fileUrls('ontologies/building, planning, zoning, and land use regulation information in Finland.ttl').raw, /building%2C%20planning%2C/);
});

test('unsafe paths cannot escape the fixed repository and literal punctuation is encoded', () => {
  for (const file of ['', null, '../ontologies/a.ttl', '/ontologies/a.ttl', 'https://other.example/a.ttl', 'ontologies/../a.ttl', 'ontologies/./a.ttl', 'ontologies//a.ttl', 'ontologies/', 'ontologies\\a.ttl', 'ontologies/a\n.ttl']) {
    assert.equal(api.safePath(file), null);
    assert.equal(api.fileUrls(file), null);
  }
  assert.ok(api.fileUrls('ontologies/a#?%.ttl').raw.endsWith('a%23%3F%25.ttl'));
});

test('search covers metadata and combines query, format and area without changing records', () => {
  const before = JSON.stringify(records);
  assert.deepEqual(api.filterRecords(records), records);
  const examples = [
    { name: 'First', file: 'ontologies/one.owl', type: 'owl', primary_use: 'Rail structures', tags: ['Construction'] },
    { name: 'Second', file: 'ontologies/two.ttl', type: 'ttl', secondary_use: 'Rail structures', tags: ['Construction'] },
    { name: 'Third', file: 'ontologies/three.owl', type: 'owl', relevance: 'Rail structures', tags: ['Safety'] }
  ];
  assert.equal(api.filterRecords(examples, { query: ' RAIL structures ' }).length, 3);
  assert.deepEqual(api.filterRecords(examples, { query: 'rail', type: 'OWL', area: 'construction' }), [examples[0]]);
  assert.deepEqual(api.filterRecords(examples, { query: 'two.ttl' }), [examples[1]]);
  assert.deepEqual(api.filterRecords(examples, { query: 'impossible' }), []);
  assert.deepEqual(api.filterOptions(records).types, ['html', 'json', 'owl', 'rdf', 'ttl', 'txt', 'xml']);
  assert.equal(api.filterOptions(records).areas.length, 7);
  assert.equal(JSON.stringify(records), before);
});

test('every original field is rendered as text, with two explicit links per record', async () => {
  const document = documentDouble();
  const controller = api.mount(document, async url => { assert.equal(url, 'ontologies.json'); return response(records); });
  assert.equal(await controller.ready, true);
  const elements = document.elements;
  assert.equal(elements.cards.children.length, 48);
  assert.equal(elements.resultCount.textContent, '48 stored files');
  assert.equal(elements.cards.attributes['aria-busy'], 'false');
  records.forEach((record, index) => {
    const card = elements.cards.children[index];
    assert.equal(card.tagName, 'article');
    assert.equal(card.children[0].tagName, 'h2');
    for (const key of ['name', 'description', 'primary_use', 'secondary_use', 'relevance', 'file']) {
      if (record[key]) assert.ok(card.textContent.includes(record[key]), record.file + ': ' + key);
    }
    for (const tag of record.tags || []) assert.ok(card.textContent.includes(tag));
    const links = descendants(card).filter(node => node.tagName === 'a');
    assert.deepEqual(links.map(node => node.textContent), ['Open stored file', 'View source on GitHub']);
    assert.deepEqual(links.map(node => node.href), Object.values(api.fileUrls(record.file)));
  });
  const hostile = { name: '<img src=x onerror=alert(1)>', description: '<script>bad()</script>', file: 'ontologies/test.ttl', type: 'ttl' };
  const safeDocument = documentDouble();
  await api.mount(safeDocument, async () => response([hostile])).ready;
  assert.ok(safeDocument.elements.cards.textContent.includes(hostile.name));
  assert.ok(safeDocument.elements.cards.textContent.includes(hostile.description));
  assert.equal(descendants(safeDocument.elements.cards).some(node => ['img', 'script'].includes(node.tagName)), false);
});

test('control events intersect filters, empty state is clear, reset restores all records and focus', async () => {
  const document = documentDouble();
  const controller = api.mount(document, async () => response(records));
  await controller.ready;
  const e = document.elements;
  e.filter.value = 'safety'; e.typeFilter.value = 'owl'; e.areaFilter.value = 'safety';
  e.typeFilter.listeners.change();
  const expected = api.filterRecords(records, { query: 'safety', type: 'owl', area: 'safety' });
  assert.equal(e.cards.children.length, expected.length);
  assert.equal(e.resultCount.textContent, expected.length + ' of 48 stored files');
  e.filter.value = 'unlikely-text-with-no-match'; e.filter.listeners.input();
  assert.equal(e.resultCount.textContent, '0 of 48 stored files');
  assert.match(e.cards.textContent, /No files match/);
  e.resetFilters.listeners.click();
  assert.equal(e.cards.children.length, 48);
  assert.equal(e.resultCount.textContent, '48 stored files');
  assert.equal(e.filter.value + e.typeFilter.value + e.areaFilter.value, '');
  assert.equal(e.filter.focused, true);
});

test('HTTP, network and invalid-JSON responses produce a visible recoverable error', async () => {
  const failures = [
    async () => ({ ok: false, status: 404 }),
    async () => { throw new Error('Offline'); },
    async () => ({ ok: true, json: async () => { throw new Error('Not JSON'); } }),
    async () => response({ records }),
    async () => response([null])
  ];
  await assert.rejects(api.loadCatalogue(failures[0]), /HTTP 404/);
  for (const fetcher of failures) {
    const document = documentDouble();
    assert.equal(await api.mount(document, fetcher).ready, false);
    assert.equal(document.elements.resultCount.textContent, 'Catalogue unavailable');
    assert.match(document.elements.cards.textContent, /Reload the page/);
    assert.equal(document.elements.cards.attributes['aria-busy'], 'false');
    const fallback = descendants(document.elements.cards).find(node => node.tagName === 'a');
    assert.equal(fallback.href, 'https://github.com/lawrencerowland/Ontologies-for-projects/tree/main/ontologies');
  }
});


test('source-condition notes reflect the empty file and all five saved HTML pages', async () => {
  const empty = records.find(record => record.file === 'ontologies/2020_11_Philosphy inpho.owl');
  assert.equal(fs.statSync(path.join(root, empty.file)).size, 0);
  assert.match(api.sourceNote(empty), /empty \(0 bytes\)/);
  assert.match(api.sourceNote(empty), /InPhO/);
  const html = records.filter(record => record.file.endsWith('.html'));
  assert.equal(html.length, 5);
  for (const record of html) {
    const stored = fs.readFileSync(path.join(root, record.file), 'utf8');
    assert.ok(/<!DOCTYPE html>/i.test(stored), record.file + ': saved HTML');
    assert.ok(/<title>[^<]+ at (master|main) · [^<]+<\/title>/i.test(stored), record.file + ': repository source-page title');
    assert.ok(stored.includes('github.githubassets.com'), record.file + ': GitHub page assets');
    assert.equal(api.sourceNote(record), 'Saved HTML page; inspect its source before treating it as an ontology file.');
  }
  const document = documentDouble();
  await api.mount(document, async () => response(records)).ready;
  for (const record of [empty, ...html]) {
    const card = document.elements.cards.children[records.indexOf(record)];
    const note = card.children.find(node => node.className === 'source-note');
    assert.equal(note.textContent, api.sourceNote(record));
    if (record.primary_use) assert.ok(card.textContent.includes(record.primary_use), 'Original metadata remains visible.');
  }
  assert.equal(api.sourceNote(records[0]), '');
});
