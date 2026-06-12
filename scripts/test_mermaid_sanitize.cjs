const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.SVGElement = dom.window.SVGElement;
global.Element = dom.window.Element;
global.DOMParser = dom.window.DOMParser;
global.getComputedStyle = dom.window.getComputedStyle;
global.CSSStyleSheet = dom.window.CSSStyleSheet;
global.MutationObserver = dom.window.MutationObserver;

dom.window.SVGElement.prototype.getBBox = function () {
  return { x: 0, y: 0, width: 100, height: 20 };
};
dom.window.SVGElement.prototype.getComputedTextLength = function () {
  return 100;
};
dom.window.Element.prototype.getBBox = dom.window.Element.prototype.getBBox || function () {
  return { x: 0, y: 0, width: 100, height: 20 };
};

// Mirror of sanitize pipeline in src/components/ui/mermaid-diagram.tsx
function normalizeDefinition(def) {
  return def
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, ' to ')
    .replace(/ /g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .trim();
}

const RISKY_LABEL = /[<>()&;]/;

function quoteFlowchartLabels(def) {
  return def
    .split('\n')
    .map((line) => {
      let out = line.replace(/\[([^"\][]+)\]/g, (m, t) =>
        RISKY_LABEL.test(t) ? `["${t.replace(/"/g, "'")}"]` : m
      );
      out = out.replace(/\{([^"{}]+)\}/g, (m, t) =>
        RISKY_LABEL.test(t) ? `{"${t.replace(/"/g, "'")}"}` : m
      );
      out = out.replace(/\|([^"|]+)\|/g, (m, t) =>
        RISKY_LABEL.test(t) ? `|"${t.replace(/"/g, "'")}"|` : m
      );
      return out;
    })
    .join('\n');
}

function candidates(def) {
  const normalized = normalizeDefinition(def);
  const list = [normalized];
  const type = normalized.trim().split(/\s/)[0];
  if (type === 'graph' || type === 'flowchart') {
    const quoted = quoteFlowchartLabels(normalized);
    if (quoted !== normalized) list.push(quoted);
  }
  return list;
}

const darkThemeVariables = { darkMode: true, background: 'transparent', primaryColor: '#1F1F23' };

async function main() {
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true, theme: 'base', themeVariables: darkThemeVariables });

  const tests = [
    ['lt_in_label', `graph TD\n  A[Candidate Feature] --> B{Is it required for trust, liquidity, or <7-day activation?}\n  B -->|No| H[Defer]`],
    ['parens_in_label', `graph TD\n  A[Auth service (OAuth2)] --> B[API Gateway (REST)]`],
    ['amp_in_label', `graph TD\n  A[Search & Filter] --> B[Results]`],
    ['edge_label_parens', `graph TD\n  A -->|fail (retry)| B[End]`],
    ['smart_quotes', `graph TD\n  A[“Smart” quotes] --> B[End]`],
    ['unicode_arrow', `graph TD\n  A[User → Checkout] --> B[End]`],
    ['html_br_kept', `graph TD\n  A[Line1<br/>Line2] --> B[End]`],
    ['simple_ok', `graph TD\n  A[Start] --> B{Decision?}\n  B -->|Yes| C[End]`],
    ['sequence_ok', `sequenceDiagram\n  participant U as User\n  U->>API: GET /items\n  API-->>U: 200 OK`],
    ['er_ok', `erDiagram\n  USER ||--o{ ORDER : places\n  ORDER { string id }`],
    ['gantt_ok', `gantt\n  title Sprints\n  dateFormat YYYY-MM-DD\n  section Sprint 1\n  Setup :a1, 2026-06-01, 7d`],
    ['pie_ok', `pie title Revenue\n  "Subs" : 60\n  "Ads" : 40`],
    ['cylinder_shape', `graph TD\n  A[(Database)] --> B[API]`],
  ];

  let pass = 0;
  for (const [name, def] of tests) {
    let ok = false;
    let lastErr = null;
    let usedFallback = false;
    for (const [i, cand] of candidates(def).entries()) {
      try {
        await mermaid.render(`t_${name}_${i}`, cand);
        ok = true;
        usedFallback = i > 0;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (ok) {
      pass++;
      console.log(`✓ ${name}${usedFallback ? ' (via quoted-label fallback)' : ''}`);
    } else {
      console.log(`✗ ${name}: ${lastErr && lastErr.message.split('\n')[0]}`);
    }
  }
  console.log(`\n${pass}/${tests.length} passed`);
  process.exit(pass === tests.length ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1) });
