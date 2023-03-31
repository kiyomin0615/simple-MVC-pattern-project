const express = require("express");
const bcrypt = require("bcrypt")
const mongodb = require("mongodb");

const database = require("../data/database");
const session = require("express-session");

const router = express.Router();

router.get("", function(req, res) {
  res.render("welcome", { csrfToken: req.csrfToken() }); // 토큰 생성
});

router.get("/signup", function(req, res) {
  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      email: '',
      confirmEmail: '',
      password: ''
    };
  }

  req.session.inputData = null;

  res.render("signup", {
    csrfToken: req.csrfToken(),
    sessionInputData: sessionInputData
  });
})

router.post("/signup", async function(req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredConfirmEmail = userData["confirm-email"];
  const enteredPassword = userData.password;

  // 유저가 잘못된 입력을 했을 때
  if (!enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim().length < 6 ||
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail.includes("@")
  ) {
    // 세션을 통해 유저가 입력한 데이터 임시 저장
    req.session.inputData = {
      hasError: true,
      message: "잘못된 값을 입력했습니다. 다시 입력해 주세요.",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword
    };
    // 세션 데이터를 데이터베이스에 저장하면 리다이렉션(동기화)
    req.session.save(function() {
      res.redirect("/signup");
    });
    return;
  }

  // 이미 존재하는 계정일 때
  const existingUser = await database.getDb().collection("users").findOne({ email: enteredEmail });
  if (existingUser) {
      // 세션을 통해 유저가 입력한 데이터 임시 저장
      req.session.inputData = {
        hasError: true,
        message: "이미 존재하는 계정입니다.",
        email: enteredEmail,
        confirmEmail: enteredConfirmEmail,
        password: enteredPassword
      };
      // 세션 데이터를 데이터베이스에 저장하면 리다이렉션(동기화)
      req.session.save(function() {
        res.redirect("/signup");
      });
      return;
  }

  // 모든 과정이 정상일 때
  const hashedPassword = await bcrypt.hash(enteredPassword, 12); // 비밀번호 해쉬

  const user = {
    email: enteredEmail,
    password: hashedPassword
  }

  database.getDb().collection("users").insertOne(user);
  
  res.redirect("/login");
})

router.get("/login", function(req, res) {
  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      email: '',
      password: '',
    };
  }

  req.session.inputData = null;

  res.render('login', {
    csrfToken: req.csrfToken(),
    sessionInputData: sessionInputData
  });
});

router.post("/login", async function(req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredPassword = userData.password;
  
  const existingUser = await database.getDb().collection("users").findOne({ email: enteredEmail });
  
  // 유저가 이메일을 잘못 입력했을 때 세션에 저장
  if (!existingUser) {
    req.session.inputData = {
      hasError: true,
      message: "로그인할 수 없습니다. 다시 입력해 주세요.",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function() {
      res.redirect("/login");
    });
    return;
  }

  const passwordEqual = await bcrypt.compare(enteredPassword, existingUser.password);
  
  // 유저가 비밀번호를 잘못 입력했을 때
  if (!passwordEqual) {
    req.session.inputData = {
      hasError: true,
      message: "로그인할 수 없습니다. 다시 입력해 주세요.",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function() {
      res.redirect("/login");
    })
    return;
  }

  // 모든 과정이 정상일 때 로그인 인증(Authentication)
  req.session.user = {
    id: existingUser._id,
    email: existingUser.email
  };
  req.session.isAuthenticated = true;
  req.session.save(function() {
    res.redirect("/admin");
  });
});

router.get("/admin", async function(req, res) {
  // 로그인(인증) 상태가 아니라면
  if (!res.locals.isAuthenticated) {
    res.status(401).render("401");
    return;
  }

  // 로그인(인증) 상태라면
  const posts = await database.getDb().collection("posts").find().toArray();

  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      title: "",
      content: ""
    };
  }

  req.session.inputData = null;

  res.render("admin", { 
    posts: posts,
    sessionInputData: sessionInputData,
    csrfToken: req.csrfToken()
  });
});

router.post("/logout", function(req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  res.redirect("/");
})

router.post("/posts", async function(req, res) {
  const enteredTitle = req.body.title;
  const enteredContent = req.body.content;

  // 잘못 입력한 경우 세션에 저장
  if (
    !enteredTitle ||
    !enteredContent ||
    enteredTitle.trim() === "" ||
    enteredContent.trim() === ""
  ) {
    req.session.inputData = {
      hasError: true,
      message: "다시 입력해 주세요.",
      title: enteredTitle,
      content: enteredContent
    };

    res.redirect("/admin");
    return;
  }

  const newPost = {
    title: enteredTitle,
    content: enteredContent
  }

  await database.getDb().collection("posts").insertOne(newPost);
  
  res.redirect("/admin");
});

router.get("/posts/:id/edit", async function(req, res) {
  const postId = new mongodb.ObjectId(req.params.id);
  const post = await database.getDb().collection("posts").find({_id: postId});

  if (!post) {
    res.status(404).render("404");
  }

  let sessionInputData = req.session.inputData;
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      title: post.title,
      content: post.content
    };
  }

  req.session.inputData = nul;;

  res.render("single-post", {
    post: post,
    sessionInputData: sessionInputData,
    csrfToken: req.csrfToken()
  });
});

router.post("/posts/:id/edit", async function(req, res) {
  const postId = new mongodb.ObjectId(req.params.id);
  const enteredTitle = req.body.title;
  const enteredContent = req.body.content;

  // 잘못 입력한 경우 세션에 저장
  if (
    !enteredTitle ||
    !enteredContent ||
    enteredTitle.trim() === "" ||
    enteredContent.trim() === ""
  ) {
    req.session.inputData = {
      hasError: true,
      message: "다시 입력해 주세요.",
      title: enteredTitle,
      content: enteredContent
    }
    res.redirect(`/posts/${postId}/edit`);
    return;
  }

  await database.getDb().collection("posts").updateOne({_id: postId}, {$set: {title: enteredTitle, content: enteredContent}});
  res.redirect("admin");
})

router.post("/posts/:id/delete", async function(req, res) {
  const postId = new mongodb.ObjectId(req.params.id);
  await database.getDb().collection("posts").deleteOne({_id: postId});

  res.redirect("/admin");
});

module.exports = router;