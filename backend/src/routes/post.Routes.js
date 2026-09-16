import { Router } from "express";
import { verifyJWT, optionalVerifyJWT } from "../middlewares/auth.Middlewares.js";
import { upload } from "../middlewares/mullter.Middlerware.js";
import { 
    createPost,
    deletePost,
    editPost,
    getPostById,
    getPostsByUsername,
    getRepulsesByUsername,
    getUserAllPosts,
    getUserFeed,
    repost,
    togglePinnedPost,

 } from "../controllers/post.Controller.js";

 const router = Router();

 router.route("/post").post(verifyJWT, upload.single("image"), createPost);
 router.route("/post/:postId").put(verifyJWT, upload.single("image"), editPost);
 router.route("/post/:postId").delete(verifyJWT, deletePost);
 router.route("/post/:postId").get(optionalVerifyJWT, getPostById);
 router.route("/feed").get(verifyJWT, getUserFeed);
 router.route("/user-profile/posts").get(verifyJWT, getUserAllPosts);
 router.route("/post/pin/:postId").patch(verifyJWT, togglePinnedPost);
 router.route("/post/repost/:postId").post(verifyJWT, repost);
 router.route("/repulses/:username").get(optionalVerifyJWT, getRepulsesByUsername);
 router.route("/:username").get(optionalVerifyJWT, getPostsByUsername);

 export default router;