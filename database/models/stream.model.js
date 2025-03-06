const { sequelize } = require("../sequelize");
const { DataTypes, Sequelize } = require("sequelize");

exports.Stream = sequelize.define("Stream", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  playlistId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Playlists",
      key: "id"
    }
  },
  streamType: {
    type: DataTypes.ENUM("movie", "tv", "serie"),
    allowNull: true
  },
  "tvg-name": {
    type: DataTypes.TEXT
  },
  "tvg-logo": {
    type: DataTypes.TEXT
  },
  "group-title": {
    type: DataTypes.TEXT
  },
  name: {
    type: DataTypes.TEXT
  },
  url: {
    type: DataTypes.TEXT
  },
  seasons: {
    type: DataTypes.JSON,
    allowNull: true
  }
});
