// Minimal DOM shim for mermaid
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

async function main() {
  const mermaid = (await import('mermaid')).default;
  
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  
  const tests = [
    ['flowchart_simple', `graph TD; A[Start] --> B{Decision?}; B -->|Yes| C[End];`],
    ['flowchart_html_br', `graph TD; A[Line1<br/>Line2] --> B[End];`],
    ['flowchart_lt', `graph TD; A[Item <7 test] --> B[End];`],
    ['quadrant_chart', `quadrantChart title Risk Heatmap x-axis Low --> High y-axis Low --> High quadrant-1 High Risk quadrant-2 Medium Risk quadrant-3 Low Risk`],
  ];
  
  for (const [name, def] of tests) {
    try {
      const r = await mermaid.render(name, def);
      console.log(`✓ ${name}: OK`);
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
    }
  }
}
main().catch(console.error);
