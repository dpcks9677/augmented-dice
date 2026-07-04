const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const url = 'https://kenney.nl/assets/casino-audio';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const match = data.match(/href="([^"]*\.zip)"/);
    if (match) {
      let zipUrl = match[1];
      if (!zipUrl.startsWith('http')) zipUrl = 'https://kenney.nl' + zipUrl;
      console.log('Found ZIP:', zipUrl);
      
      const file = fs.createWriteStream('casino.zip');
      https.get(zipUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Downloaded ZIP. Extracting...');
          try {
            execSync('powershell -Command "Expand-Archive -Path casino.zip -DestinationPath casino_sounds -Force"', { stdio: 'inherit' });
            
            // 필요한 사운드 파일 3개 복사 (diceThrow1.ogg ~ 3.ogg 등)
            // 압축 해제된 폴더명은 Casino Audio 일 확률이 높음
            execSync('powershell -Command "New-Item -ItemType Directory -Force -Path public/sounds"', { stdio: 'inherit' });
            execSync('powershell -Command "Get-ChildItem -Path casino_sounds -Recurse -Filter *dice*.ogg | Copy-Item -Destination public/sounds/ -Force"', { stdio: 'inherit' });
            
            console.log('Extracted and copied successfully.');
          } catch (e) {
            console.error('Extraction failed', e);
          }
        });
      }).on('error', (err) => {
        fs.unlink('casino.zip', ()=>{});
        console.error('Error downloading zip:', err.message);
      });
    } else {
      console.log('ZIP not found in HTML.');
    }
  });
}).on('error', (err) => {
  console.error('Error fetching page:', err.message);
});
