const express = require("express");
const mongodb = require("mongodb");

const database = require("../data/database");

const router = express.Router();

router.get("/", function(req, res) {
  res.render("welcome", { csrfToken: req.csrfToken() }); // 토큰 생성
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