const axios = require('axios')
const puppeteer = require('puppeteer')
const Hapi = require('@hapi/hapi');
const cheerio = require('cheerio');

async function generateLazada(master, source, subId1 = null, subId2 = null, subId3 = null) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.lazada.co.th/aff-short-link', { waitUntil: 'networkidle2' });

  // Type into search box
  await page.waitForSelector('body')
  await page.type('#masterLink', master);
  await page.type('#sourceUrl', source);
  await page.click('body');
  await page.waitForTimeout(500);
  if (subId1) await page.type('#subId1', subId1);
  if (subId2) await page.type('#subId2', subId2);
  if (subId3) await page.type('#subId3', subId3);
  await page.click('#submitButton');

  await page.waitForFunction('document.getElementById("affShortLink").text');
  const textSelector = await page.waitForSelector('#affShortLink');
  const url = await textSelector?.evaluate(el => el.textContent);

  await browser.close();

  return url;
}

async function generateShopee($source, $subId1 = null, $subId2 = null, $subId3 = null, $subId4 = null, $subId5 = null) {
  const advancedLinkParams = {};

  if ($subId1) {
    advancedLinkParams['subId1'] = $subId1
  }

  if ($subId2) {
    advancedLinkParams['subId2'] = $subId2
  }

  if ($subId3) {
    advancedLinkParams['subId3'] = $subId3
  }

  if ($subId4) {
    advancedLinkParams['subId4'] = $subId4
  }

  if ($subId5) {
    advancedLinkParams['subId5'] = $subId5
  }

  const response = await axios.post('https://affiliate.shopee.co.th/api/v3/gql', {
    "operationName": "batchGetCustomLink",
    "query": "\n    query batchGetCustomLink($linkParams: [CustomLinkParam!], $sourceCaller: SourceCaller){\n      batchCustomLink(linkParams: $linkParams, sourceCaller: $sourceCaller){\n        shortLink\n        longLink\n        failCode\n      }\n    }\n    ",
    "variables": {
      "linkParams": [
        {
          "originalLink": $source,
          "advancedLinkParams": advancedLinkParams
        }
      ],
      "sourceCaller": "CUSTOM_LINK_CALLER"
    }
  }, {
    headers: {
      'Cookie': 'SPC_F=pHs3I5pUH352okc9BPbbbgTnuWXtLefF; REC_T_ID=8a5d0d9e-b907-11ed-adeb-9c7da30e382d; SPC_CLIENTID=cEhzM0k1cFVIMzUyhfdrrhgmhfqtojmd; SPC_SI=p2dHZAAAAABGaE5aemVNZqNELgAAAAAAbXpGOE54RmM=; language=th; link_social_media_242856749=1; SPC_ST=.UW5nanpRalVHWXppNjBlNlBiGx7Y7eqrWsN6vY/kOm3mhUrSPizDpvOaES2SrbID2016ii88II5eLjm0XIfEvw7UsW78LFrmy20BW5GYTgkW0KuAPjZGCgejnv9yHxSXzhI3d/r+QVcMWrbkRZpkOcqTjdq5ydShv2XGPMB9i4de7lXV5AWYSpSJmnnT2ZkXCTaIKWdo5N4pDScWbGGD5Q==; SPC_U=582234084; SPC_R_T_ID=T3U4SZ/AbBimDIv7QwgkkpMmRgrZ946FlJYhsBIfqu1pWMJH0gfd09mE9LtQ6o4ESYRwNZr6h1ZpMSJx9pP5udAsq/i1rDoIE8888UHMRFHJqHy7N2SwGuBrtlnYVMcthni3yhvKAgAyGD28DM38SeEjPQevTqPmggsDsVA+D8w=; SPC_R_T_IV=eVZCZktuWDRmTnhvN1U3aA==; SPC_T_ID=T3U4SZ/AbBimDIv7QwgkkpMmRgrZ946FlJYhsBIfqu1pWMJH0gfd09mE9LtQ6o4ESYRwNZr6h1ZpMSJx9pP5udAsq/i1rDoIE8888UHMRFHJqHy7N2SwGuBrtlnYVMcthni3yhvKAgAyGD28DM38SeEjPQevTqPmggsDsVA+D8w=; SPC_T_IV=eVZCZktuWDRmTnhvN1U3aA==; language=th; link_social_media_582234084=1; SPC_EC=bWwxWVdYcUtodXVIQ096T4Uf/XncvOo8Gaus1lkakBQ0lJt6rBPb2TRRvQg+FwuRKoBTVppTQxcc5j5aazhNQMaLwB/jZhhSqHPGu2+gKHFMfBG83s2yUDk0ry1eBGEHw0NXM4oO9PzHIPjgSpk4ISCijoxJm+ybgBQYxNPkGsY='
    }
  })

  return response.data.data.batchCustomLink[0].shortLink ?? null
}

async function generateXiaohongshu($url) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto(`https://dlpanda.com/th/xiaohongshu?url=${$url}`, { waitUntil: 'domcontentloaded' });
  const data = await page.evaluate(() => document.querySelector('*').outerHTML)
  await browser.close()

  const $ = cheerio.load(data)
  const images = []

  $('.domain-info-wrap img').each((index, item) => {
    images.push(item.attribs.src)
  })

  return images.splice(1)
}

const init = async () => {
  const server = Hapi.server({
    port: 80,
    host: '0.0.0.0'
  });

  server.route({
    method: 'GET',
    path: '/lazada',
    handler: async (request, h) => {
      try {
        if (!request.query.master) {
          throw new Error('โปรดระบุ Root link')
        }

        if (!request.query.source) {
          throw new Error('โปรดระบุ Source link')
        }

        const url = await generateLazada(request.query.master, request.query.source, request.query.subId1, request.query.subId2, request.query.subId3)
        return url
      } catch (e) {
        return { status: 'error', message: e.message }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/shopee',
    handler: async (request, h) => {
      try {
        const url = await generateShopee(request.query.source, request.query.subId1, request.query.subId2, request.query.subId3, request.query.subId4, request.query.subId5)
        return url
      } catch (e) {
        return { status: 'error', message: e.message }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/xiaohongshu',
    handler: async (request, h) => {
      try {
        const images = await generateXiaohongshu(request.query.url)
        let html = ''
        
        for (const image of images) {
          html += `<img src="${image}" />`
        }

        return html
      } catch (e) {
        return { status: 'error', message: e.message }
      }
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();

