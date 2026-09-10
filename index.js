const http = require('http');
const PORT = process.env.PORT || 10000;

const JSON_URL = "https://lingering-surf-17b2.prtstream.workers.dev/";
const PLAYLIST_URL = "https://mainplaylist.poonamchouhan076.workers.dev/";

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/check') {
    try {
      // 1. Dono URLs se data fetch karo
      const [jsonRes, playlistRes] = await Promise.all([
        fetch(JSON_URL).then(r => r.json()),
        fetch(PLAYLIST_URL).then(r => r.text())
      ]);

      const channelsData = jsonRes;
      const playlistText = playlistRes;

      // 2. Playlist ko lines mein tod kar, har ek channel ke pure block ko alag karo
      const lines = playlistText.split(/\r?\n/);
      let blocks = [];
      let currentBlock = [];

      for (let line of lines) {
        if (line.startsWith('#EXTINF:')) {
          if (currentBlock.length > 0) {
            blocks.push(currentBlock.join('\n'));
            currentBlock = [];
          }
        }
        if (line.trim() !== '') {
          currentBlock.push(line);
        }
      }
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
      }

      let finalLivePlaylist = "#EXTM3U\n";

      // 3. Sirf live channels ke blocks ko match karke add karo
      for (const [key, info] of Object.entries(channelsData)) {
        if (info.status === 'live' && info.title) {
          let matchedBlock = blocks.find(block => {
            const lowerBlock = block.toLowerCase();
            const searchKey = info.channel_name.toLowerCase();
            
            if (searchKey.includes("star sports 1 hd") && lowerBlock.includes("star sports 1 digital")) return true;
            if (searchKey.includes("star sports 1 hindi hd") && lowerBlock.includes("star sports 1 hindi digital")) return true;
            if (searchKey.includes("star sports 2 hd") && lowerBlock.includes("star sports 2 digital")) return true;
            if (searchKey.includes("star sports 2 hindi hd") && lowerBlock.includes("star sports hindi 2 hd digital")) return true;
            if (searchKey.includes("star sports 3") && (lowerBlock.includes("star sports 3 [ digital ]") || lowerBlock.includes("star sports 3"))) return true;
            if (searchKey.includes("select 1") && lowerBlock.includes("star sports select 1 digital")) return true;
            if (searchKey.includes("select 2") && lowerBlock.includes("star sports select 2 digital")) return true;
            
            return lowerBlock.includes(searchKey.replace("hd", "").trim());
          });

          if (matchedBlock) {
            let modifiedBlock = matchedBlock;

            // Group-title change karo
            modifiedBlock = modifiedBlock.replace(/group-title="[^"]*"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');

            // Title ko JSON wale live match title se replace karo
            const commaIndex = modifiedBlock.indexOf(',');
            if (commaIndex !== -1) {
              const metaPart = modifiedBlock.substring(0, commaIndex + 1);
              modifiedBlock = metaPart + info.title;
            }

            // Poora block (license keys, cookies, URL ke sath) final list mein jodo
            finalLivePlaylist += modifiedBlock + "\n";
          }
        }
      }

      // 4. Final valid M3U playlist return karo
      res.writeHead(200, { "Content-Type": "audio/x-mpegurl; charset=utf-8" });
      res.end(finalLivePlaylist);

    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error generating playlist: " + err.message);
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
