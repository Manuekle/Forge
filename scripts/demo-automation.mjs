import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONFIG = {
  url: 'http://localhost:3000',
  projectName: 'Aura Energy',
  videoPath: './recordings/',
  useOBS: true,
};

async function runDemo() {
  console.log('🚀 Iniciando orquestación de la demo...');

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
    await page.goto(`${CONFIG.url}/auth/signin`);
    
    console.log('🔐 Ingresando credenciales demo...');
    await page.fill('input[type="email"]', 'demo@forge.dev');
    await page.fill('input[type="password"]', 'forge');
    
    console.log('📍 URL actual:', page.url());
    
    // Hacemos clic y esperamos a que cargue el dashboard
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);

    console.log('📍 URL tras login:', page.url());
    
    if (page.url().includes('vercel.app')) {
      console.warn('⚠️ ADVERTENCIA: Redirigido a Vercel. Forzando localhost...');
      await page.goto(`${CONFIG.url}/dashboard`);
    }

    // En lugar de esperar por un texto que puede fallar por animaciones, 
    // esperamos por la estructura del dashboard.
    console.log('⏳ Esperando carga completa de proyectos...');
    await page.waitForSelector('h2:has-text("Recent projects")', { timeout: 20000 });
    
    console.log(`📂 Buscando proyecto: ${CONFIG.projectName}...`);
    // Buscamos el link que tenga exactamente el nombre de nuestro proyecto de demo
    const projectLink = page.locator(`a:has-text("${CONFIG.projectName}")`).first();
    await projectLink.waitFor({ state: 'visible', timeout: 20000 });
    
    console.log('🖱️ Entrando al proyecto...');
    await projectLink.click();
    
    await page.waitForURL('**/projects/*', { timeout: 20000 });
    console.log('✅ Proyecto cargado. Iniciando flujo...');
    await page.waitForTimeout(2000);

    // Flujo de la demo
    await page.click('button:has-text("New run")');
    await page.waitForSelector('textarea', { timeout: 5000 });
    await page.fill('textarea', 'Constraint: GDPR 2026 vs Blockchain Transparency. Force a debate between QA and Architect regarding PII leakage.');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Start run")');
    
    console.log('🧠 Orquestación en curso...');
    await page.click('text=Orchestration');
    await page.waitForTimeout(12000); 

    await page.click('text=Decisions');
    await page.waitForTimeout(6000);

    await page.click('text=Sources');
    await page.waitForTimeout(4000);

    console.log('💻 Entrando a Code...');
    await page.click('text=Code');
    await page.waitForSelector('.monaco-editor', { timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.click('.monaco-editor');
    await page.waitForTimeout(1000);
    await page.keyboard.type('\n// GDPR 2026 Compliance: Zero-Knowledge Layer verified by Forge AI Engine\n', { delay: 60 });
    await page.waitForTimeout(2000);

    console.log('🚀 Realizando Commit...');
    await page.click('button:has-text("Commit")');
    await page.waitForSelector('input[placeholder="feat: initial app scaffold"]');
    await page.fill('input[placeholder="feat: initial app scaffold"]', 'feat: zero-knowledge compliance layer verified');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Commit & push")');

    await page.waitForSelector('text=Committed to GitHub', { timeout: 20000 });
    console.log('🏆 ¡Demo finalizada con éxito!');

  } catch (error) {
    console.error('❌ Error durante la demo:', error);
    console.log('📍 URL del error:', page.url());
  } finally {
    console.log('💾 Cerrando...');
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
