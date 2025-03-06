const { Playlist } = require("./database/models/playlist.model");
const { sequelize, Stream, Category } = require("./database");
const {
  createXtreamUrl,
  downloadFile,
  serializeUrl,
  readM3U,
  parseM3U,
  extractTVChannelsAndCategories,
  extractMoviesAndCategories,
  extractSeriesAndCategories,
  paginate,
  escapeLike
} = require("./service");
const fs = require("fs");
const { Op } = require("sequelize");

exports.createPlaylist = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { playlistName, host, username, password, formType, m3uUrl } =
      req.body;
    let url =
      formType == "xtream"
        ? createXtreamUrl({ host, username, password })
        : m3uUrl;
    const serializedUrl = serializeUrl(url);
    const isPlaylistExist = await Playlist.findOne({
      where: { url: serializedUrl }
    });
    if (isPlaylistExist) {
      return res.status(200).json({
        success: true,
        data: {
          id: isPlaylistExist.id,
          isParsed: isPlaylistExist.isParsed
        }
      });
    }

    const playlist = await Playlist.create(
      { url: serializedUrl, name: playlistName },
      { transaction: t }
    );
    await downloadFile(url, playlist.id);
    await t.commit();
    res.status(200).json({
      success: true,
      data: { id: playlist.id, isParsed: playlist.isParsed }
    });
  } catch (error) {
    await t.rollback();
    console.log("Error creating playlist", error);
    res.status(500).json({ success: false, error: "Error creating playlist" });
  }
};

// exports.parsePlaylist = async (req, res) => {
//   const t = await sequelize.transaction();
//   const t1 = await sequelize.transaction();
//   const t2 = await sequelize.transaction();
//   const t3 = await sequelize.transaction();

//   try {
//     const { id } = req.params;
//     const playlist = await Playlist.findByPk(id);
//     if (!playlist) {
//       return res
//         .status(404)
//         .json({ success: false, error: "Playlist not found" });
//     }
//     if (playlist.isParsed) {
//       return res.status(200).json({
//         success: true,
//         message: "Playlist already parsed",
//         data: {
//           isParsed: true,
//           id: playlist.id,
//           name: playlist.name
//         }
//       });
//     }
//     // Parse the playlist
//     const m3uContent = await readM3U(`downloads/${playlist.id}.m3u`);

//     const shows = await parseM3U(m3uContent);
//     const { tvChannels, categories: tvCategories } =
//       await extractTVChannelsAndCategories(shows, playlist.id);

//     const { movies, categories: moviesCategories } =
//       await extractMoviesAndCategories(shows, playlist.id);

//     const { series, categories: seriesCategories } =
//       await extractSeriesAndCategories(shows, playlist.id);

//     await Stream.bulkCreate(tvChannels, { transaction: t });
//     await Stream.bulkCreate(series, { transaction: t1 });
//     await Stream.bulkCreate(movies, { transaction: t2 });

//     const categories = [
//       ...tvCategories.map((category) => ({
//         "group-title": category,
//         playlistId: playlist.id,
//         categoryType: "tv"
//       })),
//       ...moviesCategories.map((category) => ({
//         "group-title": category,
//         playlistId: playlist.id,
//         categoryType: "movie"
//       })),
//       ...seriesCategories.map((category) => ({
//         "group-title": category,
//         playlistId: playlist.id,
//         categoryType: "serie"
//       }))
//     ];

//     await Category.bulkCreate(categories, { transaction: t3 });
//     // await playlist.update({ isParsed: new Date() }, { transaction: t });
//     await t.commit();
//     await t1.commit();
//     await t2.commit();
//     await t3.commit();
//     res.status(200).json({
//       success: true,
//       data: {
//         isParsed: true,
//         id: playlist.id,
//         name: playlist.name
//       }
//     });
//   } catch (error) {
//     await t.rollback();
//     await t1.rollback();
//     await t2.rollback();
//     await t3.rollback();
//     console.log("Error parsing playlist", error);
//     res.status(500).json({ success: false, error: "Error parsing playlist" });
//   }
// };

exports.parsePlaylist = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const playlist = await Playlist.findByPk(id, { transaction: t });

    if (!playlist) {
      return res
        .status(404)
        .json({ success: false, error: "Playlist not found" });
    }

    if (playlist.isParsed) {
      return res.status(200).json({
        success: true,
        message: "Playlist already parsed",
        data: {
          isParsed: true,
          id: playlist.id,
          name: playlist.name
        }
      });
    }

    // Parse the playlist
    const m3uContent = await readM3U(`downloads/${playlist.id}.m3u`);
    const shows = await parseM3U(m3uContent);

    const { tvChannels, categories: tvCategories } =
      await extractTVChannelsAndCategories(shows, playlist.id);

    const { movies, categories: moviesCategories } =
      await extractMoviesAndCategories(shows, playlist.id);

    const { series, categories: seriesCategories } =
      await extractSeriesAndCategories(shows, playlist.id);

    // Insert data in batches
    const batchSize = 100;
    for (let i = 0; i < tvChannels.length; i += batchSize) {
      const batch = tvChannels.slice(i, i + batchSize);
      await Stream.bulkCreate(batch, { transaction: t });
    }

    for (let i = 0; i < series.length; i += batchSize) {
      const batch = series.slice(i, i + batchSize);
      await Stream.bulkCreate(batch, { transaction: t });
    }

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      await Stream.bulkCreate(batch, { transaction: t });
    }

    const categories = [
      ...tvCategories.map((category) => ({
        "group-title": category,
        playlistId: playlist.id,
        categoryType: "tv"
      })),
      ...moviesCategories.map((category) => ({
        "group-title": category,
        playlistId: playlist.id,
        categoryType: "movie"
      })),
      ...seriesCategories.map((category) => ({
        "group-title": category,
        playlistId: playlist.id,
        categoryType: "serie"
      }))
    ];

    await Category.bulkCreate(categories, { transaction: t });

    // Mark playlist as parsed
    await playlist.update({ isParsed: new Date() }, { transaction: t });

    // Commit the transaction
    await t.commit();

    res.status(200).json({
      success: true,
      data: {
        isParsed: true,
        id: playlist.id,
        name: playlist.name
      }
    });
  } catch (error) {
    // Rollback the transaction on error
    await t.rollback();
    console.log("Error parsing playlist", error);

    // Detailed error response
    res.status(500).json({
      success: false,
      error: "Error parsing playlist",
      details: error.message
    });
  }
};

exports.getData = async (req, res) => {
  try {
    const id = req.params.id;
    const type = req.params.type;
    const page = req.query.page || 1;
    const streams = await Stream.findAndCountAll({
      where: {
        streamType: type,
        playlistId: id,
        ...(req.query.category
          ? {
              "group-title": {
                [Op.like]: `%${escapeLike(
                  decodeURIComponent(req.query.category)
                )}%`
              }
            }
          : {})
      },
      ...paginate(page, 50)
    });
    if (!streams) {
      return res.status(404).json({ success: false, error: "Data not found" });
    }
    const categories = await Category.findAll({
      where: { categoryType: type, playlistId: id, isVisible: true }
    });

    return res
      .status(200)
      .json({ success: true, data: { streams, categories } });
  } catch (error) {
    console.log("Error getting data", error);
    res.status(500).json({ success: false, error: "Error getting data" });
  }
};

exports.updateCategoryVisibility = async (req, res) => {
  try {
    const { id, isVisible } = req.body;
    const category = await Category.findByPk(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: "Category not found" });
    }
    await category.update({ isVisible });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.log("Error updating category visibility", error);
    res
      .status(500)
      .json({ success: false, error: "Error updating category visibility" });
  }
};
