import mermaid from 'mermaid';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const definition = `graph TD
    A[Deliverables] --> B[PRD]
    A --> C[Backlog]
    B --> D{Review}
    C --> D
`;

async function test() {
  try {
    mermaid.initialize({ startOnLoad: false, theme: 'base' });
    const { svg } = await mermaid.render('mermaid-test', definition);
    console.log(svg);
  } catch (e) {
    console.error(e);
  }
}

test();
