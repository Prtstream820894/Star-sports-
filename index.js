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

      // 2. Playlist ko #EXTINF se blocks mein tod lo taaki har channel ka poora data sath rahe
      const parts = playlistText.split('#EXTINF:');
      let blocks = parts.slice(1).map(block => '#EXTINF:' + block);

      let finalLivePlaylist = "#EXTM3U\n";

      // 3. Sirf live channels ke blocks ko match karke add karo
      for (const [key, info] of Object.entries(channelsData)) {
        if (info.status === 'live' && info.title) {
          let matchedBlock = blocks.find(block => {
            const lowerBlock = block.toLowerCase();
            const searchKey = info.channel_name.toLowerCase();
            
            if (searchKey.includes("star sports 1 hd") && lowerBlock.includes("star sports 1 digital")) return true;
            if (searchKey.includes("star sports 1 hindi hd") && lowerBlock.includes("star sports 1 hindi digital")) return true;
            if (searchKey.includes("star sports 2 hd") && lowerBlock.includes("star sports 2 HD")) return true;
            if (searchKey.includes("star sports 2 hindi hd") && lowerBlock.includes("star sports hindi 2 hd digital")) return true;
            if (searchKey.includes("star sports 3") && (lowerBlock.includes("star sports 3 [ digital ]") || lowerBlock.includes("star sports 3"))) return true;
            if (searchKey.includes("select 1") && lowerBlock.includes("star sports select 1 digital")) return true;
            if (searchKey.includes("select 2") && lowerBlock.includes("star sports select 2 digital")) return true;
            
            return lowerBlock.includes(searchKey.replace("hd", "").trim());
          });

          if (matchedBlock) {
            let modifiedBlock = matchedBlock.trim();

            // Group-title change karo
            modifiedBlock = modifiedBlock.replace(/group-title="[^"]*"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');

            // Title ko JSON wale live match title se replace karo (pehli line ke comma ke baad)
            const firstLineEnd = modifiedBlock.indexOf('\n');
            const metaLine = firstLineEnd !== -1 ? modifiedBlock.substring(0, firstLineEnd) : modifiedBlock;
            const commaIndex = metaLine.indexOf(',');
            
            if (commaIndex !== -1) {
              const prefix = metaLine.substring(0, commaIndex + 1);
              modifiedBlock = prefix + info.title + modifiedBlock.substring(metaLine.length);
            }

            // Poora block (license keys, cookies, URL ke sath) final list mein jodo
            finalLivePlaylist += modifiedBlock + "\n\n";
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
