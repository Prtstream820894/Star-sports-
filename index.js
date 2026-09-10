const http = require('http');
const PORT = process.env.PORT || 3000;

const channelsMap = {
  "star sports 1": "https://www.epgschedule.com/channel/star-sports-1/",
  "star sports 1 hindi": "https://www.epgschedule.com/channel/star-sports-1-hindi-hd/",
  "star sports 2": "https://www.epgschedule.com/channel/star-sports-2-hd/",
  "star sports 3": "https://www.epgschedule.com/channel/star-sports-3/",
  "star sports select 1": "https://www.epgschedule.com/channel/star-sports-select-1-hd/",
  "star sports select 2": "https://www.epgschedule.com/channel/star-sports-select-2-hd/",
  "star sports khel": "https://www.epgschedule.com/channel/star-sports-khel/"
};

const mainPlaylistUrl = "https://mainplaylist.poonamchouhan076.workers.dev/";

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/playlist.m3u') {
    try {
      const channelEntries = Object.entries(channelsMap);
      const fetchPromises = [
        fetch(mainPlaylistUrl),
        ...channelEntries.map(([_, url]) => fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }))
      ];

      const responses = await Promise.all(fetchPromises);
      const playlistText = await responses[0].text();
      
      const epgTexts = {};
      for (let i = 0; i < channelEntries.length; i++) {
        epgTexts[channelEntries[i][0]] = await responses[i + 1].text();
      }

      const liveChannels = new Set();
      for (const [channelKey, htmlContent] of Object.entries(epgTexts)) {
        if (isCurrentlyLive(htmlContent)) {
          liveChannels.add(channelKey);
        }
      }

      let finalM3u = "#EXTM3U\n";
      const lines = playlistText.split('\n');
      
      let currentExtinf = "";
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line.startsWith("#EXTINF:")) {
          currentExtinf = line;
        } else if (line && !line.startsWith("#")) {
          const streamUrl = line;
          if (currentExtinf) {
            const lowerExtinf = currentExtinf.toLowerCase();
            let matched = false;

            for (const channelKey of liveChannels) {
              if (lowerExtinf.includes(channelKey)) {
                matched = true;
                break;
              }
            }

            if (matched) {
              finalM3u += currentExtinf + "\n" + streamUrl + "\n";
            }
          }
          currentExtinf = "";
        }
      }

      res.writeHead(200, {
        "Content-Type": "audio/x-mpegurl; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(finalM3u);

    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error processing live schedules: " + err.message);
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

function isCurrentlyLive(html) {
  const lowerHtml = html.toLowerCase();
  if (lowerHtml.includes("live") || lowerHtml.includes("t20") || lowerHtml.includes("odi") || lowerHtml.includes("test") || lowerHtml.includes("ipl")) {
    if (lowerHtml.includes("highlights") || lowerHtml.includes("replay") || lowerHtml.includes("post match") || lowerHtml.includes("build up")) {
      return false;
    }
    return true;
  }
  return false;
}

server.listen(PORT, () => {
  console.log(`Render server is running on port ${PORT}`);
});
