import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONFIG = {
  url: 'https://forgems.vercel.app', 
  projectName: 'Aura Energy',
  videoPath: './recordings/',
  useOBS: true,
};

async function runDemo() {
  console.log('🚀 Iniciando orquestación de la demo en PRODUCCIÓN...');

  if (CONFIG.useOBS) {
    console.log('🎥 Iniciando grabación en OBS...');
    exec('obs --startrecording --minimize');
    await new Promise(r => setTimeout(r, 4000));
  }

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized'] 
  });

  const context = await browser.newContext({
    viewport: null,
    recordVideo: {
      dir: CONFIG.videoPath,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    console.log(`🌐 Navegando a ${CONFIG.url}/auth/signin...`);
    await page.goto(`${CONFIG.url}/auth/signin`, { waitUntil: 'networkidle' });
    
    console.log('🔐 Ingresando credenciales demo...');
    await page.fill('input[type="email"]', 'demo@forge.dev');
    await page.fill('input[type="password"]', 'forge');
    
    console.log('🖱️ Haciendo clic en Sign In...');
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);

    console.log('🌐 Dashboard de Producción cargado.');
    await page.waitForSelector('h2:has-text("Recent projects")', { timeout: 20000 });
    
    console.log(`📂 Buscando proyecto: ${CONFIG.projectName}...`);
    const projectLink = page.locator(`a:has-text("${CONFIG.projectName}")`).first();
    await projectLink.waitFor({ state: 'visible', timeout: 20000 });
    
    console.log('🖱️ Entrando al proyecto...');
    await projectLink.click();
    
    await page.waitForURL('**/projects/*', { timeout: 20000 });
    console.log('✅ Proyecto cargado con éxito.');
    await page.waitForTimeout(2000);

    // --- FLUJO DE LA DEMO ---
    console.log('⚡ Iniciando flujo multi-agente...');
    await page.click('button:has-text("New run")');
    await page.waitForSelector('textarea');
    await page.fill('textarea', 'Constraint: GDPR 2026 vs Blockchain Transparency. Force a debate between QA and Architect regarding PII leakage.');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Start run")');
    
    console.log('🧠 Visualizando razonamiento...');
    // Usamos selectores exactos para evitar confusiones
    await page.click('button:has-text("Orchestration")');
    await page.waitForTimeout(15000); 

    console.log('⚖️ Revisando Decisions...');
    await page.click('button:has-text("Decisions")');
    await page.waitForTimeout(6000);

    console.log('📜 Revisando Sources...');
    await page.click('button:has-text("Sources")');
    await page.waitForTimeout(4000);

    console.log('💻 Entrando a Code Workspace...');
    // Intentamos clic por rol y texto para mayor precisión
    const codeTab = page.getByRole('button', { name: /Code/i });
    await codeTab.click();
    
    console.log('⏳ Esperando a que el editor de Monaco cargue (puede tardar en Vercel)...');
    // Monaco suele tardar unos segundos en renderizar el DOM real
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 40000 });
    await page.waitForTimeout(3000);

    console.log('✍️ Realizando ajuste manual de arquitectura...');
    // Asegurarse de que el editor tiene el foco
    await page.click('.monaco-editor');
    await page.waitForTimeout(1000);
    await page.keyboard.type('\n// GDPR 2026 Compliance Architecture - Verified by Forge AI Engine\n', { delay: 60 });
    await page.waitForTimeout(2000);

    console.log('🚀 Realizando Commit en Producción...');
    await page.click('button:has-text("Commit")');
    await page.waitForSelector('input[placeholder="feat: initial app scaffold"]');
    await page.fill('input[placeholder="feat: initial app scaffold"]', 'feat: zero-knowledge compliance architecture verified');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Commit & push")');

    await page.waitForSelector('text=Committed to GitHub', { timeout: 25000 });
    console.log('🏆 ¡DEMO DE PRODUCCIÓN FINALIZADA!');

  } catch (error) {
    console.error('❌ Error durante la demo:', error);
    console.log('📍 URL del error:', page.url());
    // Tomar una captura si falla para depurar
    await page.screenshot({ path: 'recordings/error-screenshot.png' });
  } finally {
    console.log('💾 Finalizando grabación...');
    await context.close();
    await browser.close();

    if (CONFIG.useOBS) {
      console.log('⏹️ Deteniendo OBS...');
      try {
        await execAsync('pkill -INT obs'); 
      } catch (e) {
        console.log('⚠️ Cierra OBS manualmente.');
      }
    }
  }
}

runDemo();
