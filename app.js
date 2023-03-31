const path = require("path"); // path

const express = require("express"); // express
const session = require("express-session"); // session
const mongodbStore = require("connect-mongodb-session"); // mongodbStore
const csrf = require("csurf"); // crsf

const database = require("./data/database"); // database.js
const blogRoutes = require("./routes/blogRoutes"); // blogRoutes.js
const authRoutes = require(".routes/authRoutes"); // authRoutes.js

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
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60
  }
}));

// 응답(response)에 토큰 추가
app.use(csrf());

app.use(function(req, res, next) {
  const user = req.session.user;
  const isAuthenticated = req.session.isAuthenticated;

  if (!user || !isAuthenticated) {
    next();
    return;
  }

  // 로그인(인증) 상태라면
  res.locals.isAuthenticated = isAuthenticated;

  next();
})

app.use(blogRoutes);
app.use(authRoutes);

database.connectToDatabase().then(function() {
  app.listen(3000);
})