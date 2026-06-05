const https = require('https');

https.get('https://sound-platform-dev.web.app/', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const match = body.match(/src="\/assets\/(index-[A-Za-z0-9_-]+\.js)"/);
    if (!match) { console.log('No index js found'); return; }
    const jsUrl = 'https://sound-platform-dev.web.app/assets/' + match[1];
    console.log('Fetching', jsUrl);
    https.get(jsUrl, (res2) => {
      let jsBody = '';
      res2.on('data', d => jsBody += d);
      res2.on('end', () => {
        console.log('Found arabic string:', jsBody.includes('مقطع طويل'));
        console.log('Found english string:', jsBody.includes('Long Audio'));
        console.log('Found encodeURIComponent:', jsBody.includes('encodeURIComponent'));
      });
    });
  });
});
