// Gera as 7 imagens do carrossel "Apoie o Treino Livre" (1080×1350, o formato
// retrato do feed). Rode: node divulgacao/carrossel-apoio/fonte/gerar.js
const path = require("path");
const { chromium } = require("playwright");
(async () => {
  const dir = path.join(__dirname, "..");
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1400 }, deviceScaleFactor: 1 });
  await p.goto("file://" + path.join(__dirname, "carrossel.html"));
  await p.waitForTimeout(800);
  for (let i = 1; i <= 7; i++) await p.locator("#s" + i).screenshot({ path: path.join(dir, "apoie-" + i + ".png") });
  await b.close();
  console.log("ok");
})();
