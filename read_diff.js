const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\akram\\Downloads\\Sound\\sound-platform\\diff_AudioCreatePage.txt', 'utf16le');
console.log(content.substring(0, 4000));
