import mermaid from 'mermaid';
import fs from 'fs';

const diagrams = {};

const archContent = fs.readFileSync(process.argv[2] || '/tmp/arch_v4_full.txt', 'utf-8');
const archMermaid = archContent.split('```mermaid');
for (let i = 1; i < archMermaid.length; i++) {
  const block = archMermaid[i].split('```')[0].trim();
  const firstLine = block.split('\n')[0].trim();
  diagrams['arch_block_' + i] = block;
}

diagrams['flowchart_simple'] = `graph TD
  A[Start] --> B{Decision?}
  B -->|Yes| C[End]
  B -->|No| D[Other]`;

diagrams['flowchart_lt'] = `graph TD
  A[Candidate Feature] --> B{Is it required for trust, liquidity, or <7-day activation?}
  B -->|No| H[Defer]`;

async function main() {
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  
  for (const [name, def] of Object.entries(diagrams)) {
    try {
      const r = await mermaid.render(name, def);
      console.log(`✓ ${name}: OK (${r.svg.length} chars)`);
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
    }
  }
}

main().catch(console.error);
