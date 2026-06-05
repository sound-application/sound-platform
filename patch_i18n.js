const fs = require('fs');
let code = fs.readFileSync('apps/web/src/i18n/index.ts', 'utf8');

const mapping = {
  categorydiscovery: 'categoryDiscovery',
  connectivitybanner: 'connectivityBanner',
  createhub: 'createHub',
  editprofile: 'editProfile',
  filterdropdown: 'filterDropdown',
  generaldiscover: 'generalDiscover',
  generalhome: 'generalHome',
  generalme: 'generalMe',
  globalcreatehub: 'globalCreateHub',
  liveworldselector: 'liveWorldSelector',
  lockedlabels: 'lockedLabels',
  musicdiscover: 'musicDiscover',
  musichome: 'musicHome',
  musiclive: 'musicLive',
  musicme: 'musicMe',
  playlistdetail: 'playlistDetail',
  plusdiscover: 'plusDiscover',
  plushome: 'plusHome',
  plusme: 'plusMe',
  privacysettings: 'privacySettings',
  radiodiscover: 'radioDiscover',
  radiohome: 'radioHome',
  radiome: 'radioMe',
  tournamentsdiscover: 'tournamentsDiscover',
  tournamentshome: 'tournamentsHome',
  tournamentslive: 'tournamentsLive',
  tournamentsme: 'tournamentsMe'
};

for (const [lower, camel] of Object.entries(mapping)) {
  const arRegex = new RegExp(`^(\\s+)${lower}: (ar[A-Za-z]+),`, 'm');
  code = code.replace(arRegex, (match, spaces, val) => `${match}\n${spaces}${camel}: ${val},`);

  const enRegex = new RegExp(`^(\\s+)${lower}: (en[A-Za-z]+),`, 'm');
  code = code.replace(enRegex, (match, spaces, val) => `${match}\n${spaces}${camel}: ${val},`);
  
  if (code.includes('ns: [')) {
    code = code.replace(/ns: \[[^\]]+\]/, (match) => {
      const arr = JSON.parse(match.substring(4));
      if (!arr.includes(camel)) arr.push(camel);
      return `ns: ${JSON.stringify(arr)}`;
    });
  }
}

fs.writeFileSync('apps/web/src/i18n/index.ts', code, 'utf8');
console.log('Fixed i18n/index.ts aliases!');
