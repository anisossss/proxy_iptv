const { sequelize } = require("../sequelize");
const { DataTypes, Sequelize } = require("sequelize");

exports.Category = sequelize.define("Category", {
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
  "group-title": {
    type: DataTypes.STRING
  },
  categoryType: {
    type: DataTypes.ENUM("movie", "tv", "serie"),
    allowNull: true
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});
