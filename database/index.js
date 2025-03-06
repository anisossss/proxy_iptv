
const { Category } = require("./models/categories.model");
const { Playlist } = require("./models/playlist.model");
const { Stream } = require("./models/stream.model");
const { sequelize } = require("./sequelize");

// User.hasMany(Service, {
//   foreignKey: "userId",
//   onUpdate: "CASCADE",
//   onDelete: "CASCADE",
// });

// User.hasMany(Others, {
//   foreignKey: "userId",
//   onUpdate: "CASCADE",
//   onDelete: "CASCADE",
// });

// User.hasMany(Card, {
//   foreignKey: "userId",
//   onUpdate: "CASCADE",
//   onDelete: "CASCADE",
// });

// Service.belongsTo(User, {
//   foreignKey: "userId",
//   onUpdate: "CASCADE",
//   onDelete: "CASCADE",
// });

// Card.belongsTo(User, {
//   foreignKey: "userId",
//   onUpdate: "CASCADE",
//   onDelete: "CASCADE",
// });

module.exports = {
  Playlist: Playlist,
  Category: Category,
  Stream: Stream,
  sequelize: sequelize
};
