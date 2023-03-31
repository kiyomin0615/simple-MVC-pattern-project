const path = require("path"); // path

const express = require("express"); // express
const session = require("express-session"); // session
const mongodbStore = require("connect-mongodb-session"); // mongodbStore
const csrf = require("csurf"); // crsf

const database = require("./data/database"); // database.js
const blogRoutes = require("./routes/blogRoutes"); // blog.js

// 몽고DB 세션 스토어 설정
const MongoDBStore = mongodbStore(session);
const store = new MongoDBStore({
  uri: "mongodb://0.0.0.0:27017",
  databaseName: "auth-demo",
  collection: "sessions"
})

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({extended: false}));

// 세션 설정
app.use(session({
  secret: "this-is-secret",
  resave: false,
  saveUninitialized: false,
  store: store, // 몽고DB 세션 스토어에 세션이 자동으로 저장된다
  cookie: {
    maxAge: 1000 * 60 * 60 // 60분의 유효기간
  }
}))

// 응답(response)에 토큰 추가
app.use(csrf());

app.use(blogRoutes);

database.connectToDatabase().then(function() {
  app.listen(3000);
})