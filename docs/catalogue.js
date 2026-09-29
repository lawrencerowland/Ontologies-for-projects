(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.OntologyCatalogue = api;
    const start = () => api.mount(root.document, root.fetch.bind(root));
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const repository = 'https://github.com/lawrencerowland/Ontologies-for-projects';
  const rawRoot = 'https://raw.githubusercontent.com/lawrencerowland/Ontologies-for-projects/main/';
  const text = value => typeof value === 'string' ? value : '';
  const normalise = value => text(value).trim().toLowerCase();
  const tags = record => Array.isArray(record.tags) ? record.tags.filter(tag => typeof tag === 'string') : [];
  const fileType = record => text(record.file_type || record.type);

  function safePath(file) {
    if (typeof file !== 'string' || /[\\\x00-\x1f\x7f]/.test(file)) return null;
    const parts = file.split('/');
    if (parts.length < 2 || parts[0] !== 'ontologies' || parts.some(part => !part || part === '.' || part === '..')) return null;
    return file;
  }

  function fileUrls(file) {
    if (!safePath(file)) return null;
    const encoded = file.split('/').map(part => encodeURIComponent(part)
      .replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())).join('/');
    return { raw: rawRoot + encoded, source: repository + '/blob/main/' + encoded };
  }

  function sourceNote(record) {
    if (record.file === 'ontologies/2020_11_Philosphy inpho.owl') {
      return 'The stored copy is empty (0 bytes). Search for “InPhO” to see the other records.';
    }
    if (text(record.file).toLowerCase().endsWith('.html')) {
      return 'Saved HTML page; inspect its source before treating it as an ontology file.';
    }
    return '';
  }

  function filterRecords(records, filters = {}) {
    const terms = normalise(filters.query).split(/\s+/).filter(Boolean);
    const type = normalise(filters.type);
    const area = normalise(filters.area);
    return records.filter(record => {
      const recordTags = tags(record).map(normalise);
      const searchable = [record.name, record.description, record.file, fileType(record), record.primary_use,
        record.secondary_use, record.relevance, ...tags(record)].map(text).join(' ').toLowerCase();
      return terms.every(term => searchable.includes(term)) &&
        (!type || normalise(fileType(record)) === type) && (!area || recordTags.includes(area));
    });
  }

  function filterOptions(records) {
    const sorted = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return { types: sorted(records.map(fileType)), areas: sorted(records.flatMap(tags)) };
  }

  async function loadCatalogue(fetcher) {
    const response = await fetcher('ontologies.json');
    if (!response.ok) throw new Error('Catalogue request failed: HTTP ' + response.status);
    const records = await response.json();
    if (!Array.isArray(records) || records.some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
      throw new Error('Catalogue must contain an array of records.');
    }
    return records;
  }

  function mount(document, fetcher) {
    const elements = Object.fromEntries(['filter', 'typeFilter', 'areaFilter', 'cards', 'resultCount', 'resetFilters']
      .map(id => [id, document.getElementById(id)]));
    if (Object.values(elements).some(element => !element)) throw new Error('Catalogue controls are missing.');
    let records = [];
    let loaded = false;
    const controls = [elements.filter, elements.typeFilter, elements.areaFilter, elements.resetFilters];
    const element = (tag, className, value) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (value !== undefined) node.textContent = value;
      return node;
    };
    const link = (label, href) => {
      const node = element('a', '', label);
      node.href = href;
      return node;
    };
    function field(card, label, value, className = 'card-field') {
      if (!text(value).trim()) return;
      const paragraph = element('p', className);
      paragraph.append(element('strong', '', label + ': '), document.createTextNode(value));
      card.append(paragraph);
    }
    function card(record) {
      const item = element('article', 'card');
      item.append(element('h2', '', text(record.name) || text(record.file)));
      const condition = sourceNote(record);
      if (condition) item.append(element('p', 'source-note', condition));
      if (text(record.description).trim()) item.append(element('p', 'card-description', record.description));
      field(item, 'Primary use', record.primary_use);
      field(item, 'Secondary use', record.secondary_use);
      field(item, 'Relevance', record.relevance);
      const file = element('p', 'card-file');
      if (fileType(record)) file.append(element('span', 'file-format', fileType(record).toUpperCase()), document.createTextNode(' '));
      file.append(document.createTextNode(text(record.file)));
      item.append(file);
      const urls = fileUrls(record.file);
      if (urls) {
        const links = element('p', 'card-links');
        links.append(link('Open stored file', urls.raw), document.createTextNode(' '), link('View source on GitHub', urls.source));
        item.append(links);
      } else {
        item.append(element('p', 'catalogue-message', 'The stored file path is unavailable.'));
      }
      field(item, 'Tags', tags(record).join(', '), 'card-tags');
      return item;
    }
    function render() {
      if (!loaded) return;
      const visible = filterRecords(records, { query: elements.filter.value, type: elements.typeFilter.value, area: elements.areaFilter.value });
      elements.cards.replaceChildren(...visible.map(card));
      elements.resultCount.textContent = visible.length === records.length
        ? records.length + ' stored files' : visible.length + ' of ' + records.length + ' stored files';
      if (!visible.length) {
        elements.cards.append(element('p', 'catalogue-message', 'No files match these filters. Try another term or reset the filters.'));
      }
    }
    function reset() {
      elements.filter.value = '';
      elements.typeFilter.value = '';
      elements.areaFilter.value = '';
      render();
      elements.filter.focus();
    }
    function options(select, label, values) {
      const all = element('option', '', label);
      all.value = '';
      const choices = values.map(value => {
        const choice = element('option', '', value);
        choice.value = normalise(value);
        return choice;
      });
      select.replaceChildren(all, ...choices);
      select.value = '';
    }
    elements.filter.addEventListener('input', render);
    elements.typeFilter.addEventListener('change', render);
    elements.areaFilter.addEventListener('change', render);
    elements.resetFilters.addEventListener('click', reset);
    elements.resultCount.textContent = 'Loading stored files…';
    elements.cards.setAttribute('aria-busy', 'true');
    controls.forEach(control => { control.disabled = true; });
    const ready = loadCatalogue(fetcher).then(data => {
      records = data;
      const choices = filterOptions(records);
      options(elements.typeFilter, 'All file formats', choices.types);
      options(elements.areaFilter, 'All domains and areas', choices.areas);
      controls.forEach(control => { control.disabled = false; });
      loaded = true;
      render();
      return true;
    }).catch(() => {
      elements.resultCount.textContent = 'Catalogue unavailable';
      const message = element('p', 'catalogue-message', 'The catalogue could not be loaded. Reload the page to try again, or ');
      message.append(link('view the stored files on GitHub', repository + '/tree/main/ontologies'), document.createTextNode('.'));
      elements.cards.replaceChildren(message);
      return false;
    }).finally(() => elements.cards.setAttribute('aria-busy', 'false'));
    return { ready, render, reset };
  }
  return { safePath, fileUrls, sourceNote, filterRecords, filterOptions, loadCatalogue, mount };
});
