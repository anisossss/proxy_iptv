const { sequelize } = require("../sequelize");
const { DataTypes, Sequelize } = require("sequelize");

exports.Playlist = sequelize.define("Playlist", {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING
  },
  name: {
    type: DataTypes.TEXT
  },
  isParsed: {
    type: DataTypes.DATE
  }
});
