const http = require('http');
const PORT = process.env.PORT || 10000;

const JSON_URL = "https://lingering-surf-17b2.prtstream.workers.dev/";
const PLAYLIST_URL = "https://mainplaylist.poonamchouhan076.workers.dev/";

async function getYouTubeThumb(title) {
  try {
    const html = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`
    ).then(r => r.text());

    const match = html.match(/"videoId":"([^"]+)"/);

    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
  } catch (e) {
    console.log("Thumb Error:", e.message);
  }

  return "";
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/check') {
    try {

      const [jsonRes, playlistRes] = await Promise.all([
        fetch(JSON_URL).then(r => r.json()),
        fetch(PLAYLIST_URL).then(r => r.text())
      ]);

      const channelsData = jsonRes;
      const playlistText = playlistRes;

      const parts = playlistText.split('#EXTINF:');
      let blocks = parts.slice(1).map(block => '#EXTINF:' + block);

      let finalLivePlaylist = "#EXTM3U\n";

      for (const [key, info] of Object.entries(channelsData)) {

        if (info.status === 'live' && info.title) {

          let matchedBlock = blocks.find(block => {
            const lowerBlock = block.toLowerCase();
            const searchKey = info.channel_name.toLowerCase();

            if (searchKey.includes("star sports 1 hd") && lowerBlock.includes("star sports 1 digital")) return true;
            if (searchKey.includes("star sports 1 hindi hd") && lowerBlock.includes("star sports 1 hindi digital")) return true;
            if (searchKey.includes("star sports 2 hd") && lowerBlock.includes("star sports 2 digital")) return true;
            if (searchKey.includes("star sports 2 hindi hd") && lowerBlock.includes("star sports hindi 2 hd digital")) return true;
            if (searchKey.includes("star sports 3") &&
                (lowerBlock.includes("star sports 3 [ digital ]") ||
                 lowerBlock.includes("star sports 3"))) return true;
            if (searchKey.includes("select 1") && lowerBlock.includes("star sports select 1 digital")) return true;
            if (searchKey.includes("select 2") && lowerBlock.includes("star sports select 2 digital")) return true;

            return lowerBlock.includes(
              searchKey.replace("hd", "").trim()
            );
          });

          if (matchedBlock) {

            let modifiedBlock = matchedBlock.trim();

            modifiedBlock = modifiedBlock.replace(
              /group-title="[^"]*"/,
              'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"'
            );

            const firstLineEnd = modifiedBlock.indexOf('\n');
            const metaLine = firstLineEnd !== -1
              ? modifiedBlock.substring(0, firstLineEnd)
              : modifiedBlock;

            const commaIndex = metaLine.indexOf(',');

            if (commaIndex !== -1) {
              const prefix = metaLine.substring(0, commaIndex + 1);

              modifiedBlock =
                prefix +
                info.title +
                modifiedBlock.substring(metaLine.length);
            }

            // Title ke basis par thumbnail nikalo
            const thumb = await getYouTubeThumb(info.title);

            if (thumb) {

              if (/tvg-logo="[^"]*"/i.test(modifiedBlock)) {

                modifiedBlock = modifiedBlock.replace(
                  /tvg-logo="[^"]*"/i,
                  `tvg-logo="${thumb}"`
                );

              } else {

                modifiedBlock = modifiedBlock.replace(
                  '#EXTINF:-1',
                  `#EXTINF:-1 tvg-logo="${thumb}"`
                );

              }
            }

            finalLivePlaylist += modifiedBlock + "\n\n";
          }
        }
      }

      res.writeHead(200, {
        "Content-Type": "audio/x-mpegurl; charset=utf-8"
      });

      res.end(finalLivePlaylist);

    } catch (err) {

      res.writeHead(500, {
        "Content-Type": "text/plain"
      });

      res.end("Error generating playlist: " + err.message);

    }

  } else {

    res.writeHead(404, {
      "Content-Type": "text/plain"
    });

    res.end("Not Found");

  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
