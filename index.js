const Hapi = require('@hapi/hapi');
const puppeteer = require('puppeteer');
// Comment

const init = async () => {
  const server = Hapi.server({
    port: 80,
    host: '0.0.0.0'
  });

  let browser;

  async function generateLazada(master, source, subId1 = null, subId2 = null, subId3 = null) {
    const page = await browser.newPage();
    await page.goto('https://www.lazada.co.th/aff-short-link', { waitUntil: 'networkidle2' });

    // Type into search box
    await page.waitForSelector('body');
    await page.type('#masterLink', master);
    await page.type('#sourceUrl', source);
    await page.click('body');
    await page.waitForTimeout(500);
    if (subId1) await page.type('#subId1', subId1);
    if (subId2) await page.type('#subId2', subId2);
    if (subId3) await page.type('#subId3', subId3);
    await page.click('#submitButton');
    await page.waitForFunction('document.getElementById("affShortLink").textContent');
    const url = await page.evaluate(() => {
      const element = document.getElementById('affShortLink');
      return element ? element.textContent : null;
    });

    await page.close();

    return url;
  }

  server.route({
    method: 'GET',
    path: '/',
    handler: async (request, h) => {
      const master = request.query.master;
      const source = request.query.source;
      const subId1 = request.query.subId1 || null;
      const subId2 = request.query.subId2 || null;
      const subId3 = request.query.subId3 || null;

      try {
        if (!master) {
          throw new Error('โปรดระบุ Root link');
        }

        if (!source) {
          throw new Error('โปรดระบุ Source link');
        }

        const url = await generateLazada(master, source, subId1, subId2, subId3);
        return url;
      } catch (e) {
        return { status: 'error', message: e.message };
      }
    }
  });

  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    await server.start();
    console.log('Server running on %s', server.info.uri);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
