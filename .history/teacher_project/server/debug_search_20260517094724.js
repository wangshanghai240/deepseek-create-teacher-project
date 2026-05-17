const axios = require('axios');
const cfg = {headers: {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}};

async function main() {
  const urls = [
    'https://www.peopleapp.com/api/v2/search?keyword=test',
    'https://www.peopleapp.com/api/search?keyword=test',
    'https://search.peopleapp.com/api/search?keyword=test'
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {...cfg, timeout: 10000});
      console.log(url.substring(0,60) + ': ' + r.status + ' ' + JSON.stringify(r.data).substring(0, 300));
    } catch(e) {
      console.log(url.substring(0,60) + ': ' + e.message.substring(0, 60));
    }
  }
}
main();
