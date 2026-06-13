import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * CONFIGURACIÓN DE LA DEMO
 */
const CONFIG = {
  url: 'http://localhost:3000',
  userEmail: 'demo@forge.dev',
  projectName: 'Aura Energy',
  videoPath: './recordings/',
  useOBS: true, // Cambiar a false si prefieres solo el video de Playwright
};

async function runDemo() {
  console.log('🚀 Iniciando orquestación de la demo...');

  // 1. Iniciar OBS (Opcional)
  let obsProcess = null;
  if (CONFIG.useOBS) {
    console.log('🎥 Iniciando grabación en OBS...');
    // --startrecording inicia la grabación automáticamente al abrirse
    // --minimize lo manda a la bandeja para que no estorbe
    obsProcess = exec('obs --startrecording --minimize');
    await new Promise(r => setTimeout(r, 3000)); // Esperar a que OBS caliente
  }

  const browser = await chromium.launch({ 
    headless: false, // Queremos ver la demo mientras se graba
    args: ['--start-maximized'] 
  });

  const context = await browser.newContext({
    viewport: null, // Usa toda la pantalla
    recordVideo: {
      dir: CONFIG.videoPath,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    // FLUJO GANADOR
    console.log('🌐 Cargando Dashboard...');
    await page.goto(`${CONFIG.url}/dashboard`);
    
    // Si no estamos logueados, el seed ya creó el usuario demo@forge.dev
    // Podríamos automatizar el login aquí si fuera necesario
    
    console.log(`📂 Entrando en proyecto: ${CONFIG.projectName}...`);
    await page.click(`text=${CONFIG.projectName}`);
    await page.waitForTimeout(2000);

    console.log('⚡ Iniciando Crisis de Cumplimiento...');
    await page.click('button:has-text("New run")');
    await page.fill('textarea', 'Constraint: GDPR 2026 vs Blockchain Transparency. Force a debate between QA and Architect regarding PII leakage.');
    
    console.log('🎬 ¡Acción! Iniciando Run...');
    await page.click('button:has-text("Start run")');
    
    // Ver la orquestación
    await page.click('text=Orchestration');
    console.log('🧠 Los agentes están razonando...');
    await page.waitForTimeout(8000); // Tiempo para que el grafo se mueva

    console.log('⚖️ Revisando el debate en Consensus Panel...');
    await page.click('text=Decisions');
    await page.waitForTimeout(4000);

    console.log('📜 Mostrando fuentes de confianza (Citations)...');
    await page.click('text=Sources');
    await page.waitForTimeout(3000);

    console.log('💻 De la estrategia al Código...');
    await page.click('text=Code');
    await page.waitForSelector('.monaco-editor');
    await page.waitForTimeout(2000);

    console.log('✍️ Simulando edición manual del Ingeniero...');
    await page.click('.monaco-editor');
    await page.keyboard.type('\n// Verified by Forge Compliance Engine - GDPR 2026 Safe\n');
    await page.waitForTimeout(1000);

    console.log('🚀 Finalizando con Commit a GitHub...');
    await page.click('button:has-text("Commit")');
    await page.fill('input[placeholder="feat: initial app scaffold"]', 'feat: zero-knowledge compliance layer verified');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Commit & push")');

    // Esperar al toast de éxito
    await page.waitForSelector('text=Committed to GitHub');
    console.log('✅ Demo completada con éxito.');

  } catch (error) {
    console.error('❌ Error durante la demo:', error);
  } finally {
    console.log('💾 Guardando videos y cerrando...');
    await context.close();
    await browser.close();

    if (CONFIG.useOBS) {
      console.log('⏹️ Deteniendo OBS...');
      // En Linux, matar el proceso suele ser la forma de detenerlo si no hay socket
      // OJO: Esto puede corromper el video en algunos formatos. MP4 es sensible, MKV no.
      // Se recomienda configurar OBS para grabar en MKV y que auto-remuxee a MP4.
      try {
        await execAsync('pkill -INT obs'); 
        console.log('🎬 Grabación de OBS finalizada.');
      } catch (e) {
        console.log('⚠️ No se pudo cerrar OBS automáticamente. Por favor, detén la grabación manualmente.');
      }
    }
  }
}

runDemo();
