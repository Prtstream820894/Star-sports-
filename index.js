const http = require('http');
const PORT = process.env.PORT || 10000;

const channelsMap = {
  "Star Sports 1": "https://www.epgschedule.com/channel/star-sports-1/",
  "Star Sports 1 Hindi": "https://www.epgschedule.com/channel/star-sports-1-hindi-hd/",
  "Star Sports 2": "https://www.epgschedule.com/channel/star-sports-2-hd/",
  "Star Sports 3": "https://www.epgschedule.com/channel/star-sports-3/",
  "Star Sports Select 1": "https://www.epgschedule.com/channel/star-sports-select-1-hd/",
  "Star Sports Select 2": "https://www.epgschedule.com/channel/star-sports-select-2-hd/",
  "Star Sports Khel": "https://www.epgschedule.com/channel/star-sports-khel/"
};

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/check') {
    try {
      const channelEntries = Object.entries(channelsMap);
      const fetchPromises = channelEntries.map(([_, url]) => 
        fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then(res => res.text())
      );

      const htmlContents = await Promise.all(fetchPromises);
      let output = "";

      for (let i = 0; i < channelEntries.length; i++) {
        const channelName = channelEntries[i][0];
        const html = htmlContents[i];
        
        // Simple logic to find the currently live program in the HTML
        const liveEvent = extractLiveEvent(html);

        if (liveEvent) {
          output += `${channelName}: 🔴 LIVE - ${liveEvent}\n`;
        } else {
          output += `${channelName}: No live match right now\n`;
        }
      }

      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(output);

    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error checking schedules: " + err.message);
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

function extractLiveEvent(html) {
  // Yeh basic search hai live matches ke liye
  const lowerHtml = html.toLowerCase();
  
  // Is logic ko apni website ke specific HTML tags ke hisab se tweak karna pad sakta hai
  if (lowerHtml.includes("live") || lowerHtml.includes("t20") || lowerHtml.includes("odi") || lowerHtml.includes("ipl")) {
    if (lowerHtml.includes("highlights") || lowerHtml.includes("replay")) {
      return null;
    }
    return "Ongoing Live Match/Event"; 
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`Render server is running on port ${PORT}`);
});
