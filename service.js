const axios = require("axios");
const fs = require("fs");

exports.paginate = (page, pageSize, orderBy, direction) => {
  const offset = parseInt(page - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);
  const order = [[orderBy || "createdAt", direction || "DESC"]];
  return {
    offset,
    limit,
    order
  };
};

exports.escapeLike = (str) => {
  // return str.replace(/[\\%_]/g, "\\$&");
  // return str.replace(/[\\%_()+\-|]/g, '\\$&');
  return str.replace(/[\\%_!"'()*+,\-./:;<=>?@[\]^`{|}~#\u007F-\uFFFF]/g, '\\$&');


};

exports.createXtreamUrl = (data) => {
  const url = `${data.host}/get.php?username=${data.username}&password=${data.password}&type=m3u_plus`;
  return url;
};

exports.downloadFile = async (url, fileName) => {
  const folderPath = "downloads";
  const response = await axios.get(url, { responseType: "stream" });
  const filePath = `${folderPath}/${fileName}.m3u`;
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      resolve(filePath);
    });
    writer.on("error", reject);
  });
};

exports.serializeUrl = (url) => {
  return url.replace(/^https?:\/\//, "");
};

exports.parseM3U = async (m3uContent) => {
  const shows = [];
  const lines = m3uContent.trim().split(/\r?\n/);
  const chunkSize = 500;
  let processedCount = 0;
  let currentEntry = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("#EXTINF")) {
      currentEntry = {};

      const regex = /(\w+(?:-\w+)*)="([^"]*)"/g;
      let match;
      while ((match = regex.exec(trimmedLine)) !== null) {
        currentEntry[match[1]] = match[2];
      }

      const nameRegex = /,(.*)$/;
      const nameMatch = nameRegex.exec(trimmedLine);
      currentEntry.name = nameMatch ? nameMatch[1].trim() : "";

      const tvShowRegex = /(.*?)(?: - )?[Ss](\d{1,2})[Ee](\d{1,2})\b/i;
      const matchShow = tvShowRegex.exec(currentEntry.name);

      if (matchShow) {
        currentEntry.seriesName = matchShow[1].trim();
        currentEntry.season = `Season ${parseInt(matchShow[2])}`;
        currentEntry.episode = `Episode ${parseInt(matchShow[3])}`;
      }
    } else if (
      trimmedLine &&
      !trimmedLine.startsWith("#") &&
      currentEntry.name
    ) {
      currentEntry.url = trimmedLine;
      shows.push(currentEntry);
      currentEntry = {};

      if (++processedCount % chunkSize === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  return shows;
};

exports.readM3U = async (filePath) => {
  const m3uContent = fs.readFileSync(filePath, "utf8");
  return m3uContent;
};

exports.extractTVChannelsAndCategories = async (data, id) => {
  const tvChannels = [];
  const categories = new Set();
  const chunkSize = 500;
  let processedCount = 0;

  for (const entry of data) {
    if (!entry.url.match(/\.[a-zA-Z0-9]+$/)) {
      tvChannels.push({
        playlistId: id,
        streamType: "tv",
        "tvg-id": entry["tvg-id"],
        "tvg-name": entry["tvg-name"],
        "tvg-logo": entry["tvg-logo"],
        "group-title": entry["group-title"],
        name: entry.name,
        url: entry.url
      });

      if (entry["group-title"]) {
        const upperCaseCategory = entry["group-title"].toUpperCase();
        categories.add(upperCaseCategory);
      }
    }

    if (++processedCount % chunkSize === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    tvChannels: tvChannels,
    categories: Array.from(categories).sort()
  };
};

exports.extractMoviesAndCategories = async (data, id) => {
  const movies = [];
  const categories = new Set();
  const chunkSize = 500;
  let processedCount = 0;

  // Enhanced regex to catch more series patterns
  const seriesRegex =
    /(\bS\d{1,2}\s?E\d{1,2}\b)|(\bSeason\s\d+\b)|(\bEpisode\s\d+\b)|(\bS\d+\b)/i;

  for (const entry of data) {
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(entry.url);
    const isSeriesEpisode =
      seriesRegex.test(entry.name) ||
      seriesRegex.test(entry["tvg-name"]) ||
      entry["seriesName"] ||
      entry["season"] ||
      entry["episode"];

    // Additional movie validation
    const isMovie =
      hasFileExtension && !isSeriesEpisode && !entry.name.match(/\(\d{4}\)$/); // Exclude series with year markers

    if (isMovie) {
      movies.push({ ...entry, playlistId: id, streamType: "movie" });

      if (entry["group-title"]) {
        const upperCaseCategory = entry["group-title"].toUpperCase();
        categories.add(upperCaseCategory);
      }
    }

    if (++processedCount % chunkSize === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    movies: movies,
    categories: Array.from(categories).sort()
  };
};

// exports.extractSeriesOnly = async (data) => {
//     const seriesMap = new Map();
//     const chunkSize = 500;
//     let processedCount = 0;

//     // Regex to detect series patterns
//     const seriesRegex = /(\bS\d{1,2}\s?E\d{1,2}\b)|(\bSeason\s\d+\b)|(\bEpisode\s\d+\b)|(\bS\d+\b)/i;

//     for (const entry of data) {
//         // Skip entries without series metadata or with invalid URLs
//         const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(entry.url);
//         const isSeries = seriesRegex.test(entry.name) ||
//                         seriesRegex.test(entry['tvg-name']) ||
//                         entry['seriesName'] ||
//                         entry['season'] ||
//                         entry['episode'];

//         if (hasFileExtension && isSeries) {
//             // Extract series name (remove season/episode info)
//             const seriesName = (entry.seriesName || entry['tvg-name'] || entry.name)
//                 .replace(/(\bS\d{1,2}\s?E\d{1,2}\b)|(\bSeason\s\d+\b)|(\bEpisode\s\d+\b)|(\bS\d+\b)/i, '')
//                 .trim();

//             // Extract season number
//             const seasonMatch = entry.name.match(/S(\d{1,2})/i) || entry.season?.match(/\d+/);
//             const seasonNum = seasonMatch ? seasonMatch[1] || seasonMatch[0] : '1'; // Default to season 1 if no season number found

//             // Get or create series entry
//             if (!seriesMap.has(seriesName)) {
//                 seriesMap.set(seriesName, {
//                     "tvg-id": entry['tvg-id'],
//                     "tvg-name": seriesName,
//                     "tvg-logo": entry['tvg-logo'],
//                     "group-title": entry['group-title'],
//                     "name": seriesName,
//                     seasons: new Map()
//                 });
//             }

//             const series = seriesMap.get(seriesName);

//             // Get or create season entry
//             if (!series.seasons.has(seasonNum)) {
//                 series.seasons.set(seasonNum, []);
//             }

//             // Add episode to season
//             series.seasons.get(seasonNum).push({
//                 "tvg-id": entry['tvg-id'],
//                 "tvg-name": entry['tvg-name'],
//                 "tvg-logo": entry['tvg-logo'],
//                 "group-title": entry['group-title'],
//                 "name": entry.name,
//                 "url": entry.url
//             });
//         }

//         // Yield to event loop periodically
//         if (++processedCount % chunkSize === 0) {
//             await new Promise(resolve => setTimeout(resolve, 0));
//         }
//     }

//     // Convert Map to desired output format
//     const result = [];
//     for (const [seriesName, seriesData] of seriesMap) {
//         const seasonsArray = [];
//         for (const [seasonNum, episodes] of seriesData.seasons) {
//             seasonsArray.push({
//                 season: seasonNum,
//                 episodes: episodes
//             });
//         }

//         result.push({
//             ...seriesData,
//             seasons: seasonsArray
//         });

//         // Yield during result conversion for large datasets
//         await new Promise(resolve => setTimeout(resolve, 0));
//     }

//     return result;
// };

exports.extractSeriesAndCategories = async (data, id) => {
  const seriesMap = new Map();
  const categories = new Set();
  const chunkSize = 500;
  let processedCount = 0;

  // Regex to detect series patterns
  const seriesRegex =
    /(\bS\d{1,2}\s?E\d{1,2}\b)|(\bSeason\s\d+\b)|(\bEpisode\s\d+\b)|(\bS\d+\b)/i;

  for (const entry of data) {
    // Skip entries without series metadata or with invalid URLs
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(entry.url);
    const isSeries =
      seriesRegex.test(entry.name) ||
      seriesRegex.test(entry["tvg-name"]) ||
      entry["seriesName"] ||
      entry["season"] ||
      entry["episode"];

    if (hasFileExtension && isSeries) {
      // Extract series name (remove season/episode info)
      const seriesName = (entry.seriesName || entry["tvg-name"] || entry.name)
        .replace(
          /(\bS\d{1,2}\s?E\d{1,2}\b)|(\bSeason\s\d+\b)|(\bEpisode\s\d+\b)|(\bS\d+\b)/i,
          ""
        )
        .trim();

      // Extract season number
      const seasonMatch =
        entry.name.match(/S(\d{1,2})/i) || entry.season?.match(/\d+/);
      const seasonNum = seasonMatch ? seasonMatch[1] || seasonMatch[0] : "1"; // Default to season 1 if no season number found

      // Add category to the Set
      if (entry["group-title"]) {
        const upperCaseCategory = entry["group-title"].toUpperCase();
        categories.add(upperCaseCategory);
      }

      // Get or create series entry
      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, {
          playlistId: id,
          streamType: "serie",
          "tvg-id": entry["tvg-id"],
          "tvg-name": seriesName,
          "tvg-logo": entry["tvg-logo"],
          "group-title": entry["group-title"],
          name: seriesName,
          seasons: new Map()
        });
      }

      const series = seriesMap.get(seriesName);

      // Get or create season entry
      if (!series.seasons.has(seasonNum)) {
        series.seasons.set(seasonNum, []);
      }

      // Add episode to season
      series.seasons.get(seasonNum).push({
        "tvg-id": entry["tvg-id"],
        "tvg-name": entry["tvg-name"],
        "tvg-logo": entry["tvg-logo"],
        "group-title": entry["group-title"],
        name: entry.name,
        url: entry.url
      });
    }

    // Yield to event loop periodically
    if (++processedCount % chunkSize === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // Convert Map to desired output format
  const series = [];
  for (const [seriesName, seriesData] of seriesMap) {
    const seasonsArray = [];
    for (const [seasonNum, episodes] of seriesData.seasons) {
      seasonsArray.push({
        season: seasonNum,
        episodes: episodes
      });
    }

    series.push({
      ...seriesData,
      seasons: seasonsArray
    });

    // Yield during result conversion for large datasets
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return {
    series: series,
    categories: Array.from(categories).sort() // Convert Set to sorted array
  };
};
