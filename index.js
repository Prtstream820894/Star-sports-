const http = require('http');
const PORT = process.env.PORT || 10000;

const JSON_URL = "https://lingering-surf-17b2.prtstream.workers.dev/";
const PLAYLIST_URL = "https://mainplaylist.poonamchouhan076.workers.dev/";

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/check') {
    try {
      // 1. Dono URLs se ek sath data fetch karo
      const [jsonRes, playlistRes] = await Promise.all([
        fetch(JSON_URL).then(r => r.json()),
        fetch(PLAYLIST_URL).then(r => r.text())
      ]);

      const channelsData = jsonRes;
      const playlistText = playlistRes;

      // 2. Playlist ko entries/blocks mein tod lo (#EXTINF se shuru hone wale blocks)
      const rawEntries = playlistText.split('#EXTINF:');
      let header = rawEntries[0]; // Agar playlist ke shuru mein koi header ho
      let blocks = rawEntries.slice(1);

      let updatedPlaylist = header;

      // 3. Har ek live channel ko JSON ke hisab se process karo
      for (const [key, info] of Object.entries(channelsData)) {
        // Agar channel live hai tabhi aage badho
        if (info.status === 'live' && info.title) {
          // Channel key ke hisab se playlist mein matching dhundho
          // Jaise 'star-sports-1-hd' ya 'star-sports-select-2-hd' ko playlist ke naam se match karna
          let matchedBlock = blocks.find(block => {
            const lowerBlock = block.toLowerCase();
            const searchKey = info.channel_name.toLowerCase();
            
            // "Digital" ya exact match check karne ke liye logic
            if (searchKey.includes("star sports 1 hd") && lowerBlock.includes("star sports 1 digital")) return true;
            if (searchKey.includes("star sports 1 hindi hd") && lowerBlock.includes("star sports 1 hindi digital")) return true;
            if (searchKey.includes("star sports 2 hd") && lowerBlock.includes("star sports 2 digital")) return true;
            if (searchKey.includes("star sports 2 hindi hd") && lowerBlock.includes("star sports hindi 2 hd digital")) return true;
            if (searchKey.includes("star sports 3") && (lowerBlock.includes("star sports 3 [ digital ]") || lowerBlock.includes("star sports 3"))) return true;
            if (searchKey.includes("select 1") && lowerBlock.includes("star sports select 1 digital")) return true;
            if (searchKey.includes("select 2") && lowerBlock.includes("star sports select 2 digital")) return true;
            
            // General fallback match
            return lowerBlock.includes(searchKey.replace("hd", "").trim());
          });

          if (matchedBlock) {
            // Pura block mil gaya, ab isme group-title aur display title ko replace karna hai
            let modifiedBlock = '#EXTINF:' + matchedBlock;

            // Group-title ko change karke ✨✦ʟɪᴠᴇ ᴇᴠᴇɴⵜꜱ✦✨ kar do
            modifiedBlock = modifiedBlock.replace(/group-title="[^"]*"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');

            // Purane channel name ko JSON wale naye title se replace karo (comma ke baad wala part title hota hai)
            // Jaise: #EXTINF:-1 group-title="...",Old Title -> #EXTINF:-1 group-title="...",New Title from JSON
            const commaIndex = modifiedBlock.indexOf(',');
            if (commaIndex !== -1) {
              const metaPart = modifiedBlock.substring(0, commaIndex + 1);
              modifiedBlock = metaPart + info.title;
            }

            // Updated playlist mein pura block (license keys, cookies, URL sabhi ke sath) jod do
            updatedPlaylist += modifiedBlock + "\n";
          }
        }
        // Agar status "offline" hai, toh code usko loop mein skip kar dega, isliye woh playlist mein nahi aayega (Remove ho jayega).
      }

      // 4. Final updated M3U playlist return karo
      res.writeHead(200, { "Content-Type": "audio/x-mpegurl; charset=utf-8" });
      res.end(updatedPlaylist);

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
