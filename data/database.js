const mongodb = require("mongodb"); // mongodb

let database;

async function connectToDatabase() {
  const client = await mongodb.MongoClient.connect("mongodb://0.0.0.0:27017");
  database = client.db("auth-demo"); // auth-demo 데이터베이스
}

function getDb() {
  if (!database) {
    throw { message: "데이터베이스에 연결해주세요!"};
  }
  return database;
}

module.exports = {
  connectToDatabase: connectToDatabase,
  getDb: getDb
}