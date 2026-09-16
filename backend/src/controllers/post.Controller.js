import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Post } from "../models/post.Model.js";
import {User} from "../models/user.Model.js";
import { Comment} from "../models/comment.Model.js";
import { Follow} from "../models/follow.Model.js";
import { cloudinaryUpload } from "../utils/cloudnaryService.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";

const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

  // ✅ Validation
  if (!content?.trim() && !req.file) {
    throw new ApiError(400, "Post must have either content or an image");
  }

  // ✅ Image upload handling
  let imageUrl = "";
  const imageLocalPath = req.file?.path;

  if (imageLocalPath) {
    const uploadedImage = await cloudinaryUpload(imageLocalPath);
    if (!uploadedImage?.url) {
      throw new ApiError(500, "Image upload failed, please try again");
    }
    imageUrl = uploadedImage.url;
  }

  // ✅ Create post in DB
  const post = await Post.create({
    content: content?.trim() || "",
    image: imageUrl,
    author: req.user._id,
  });

  if (!post) {
    throw new ApiError(500, "Something went wrong while creating the post");
  }

  // ✅ Populate author details before sending response
  const populatedPost = await Post.findById(post._id)
    .populate("author", "fullname username avatar") // only required fields
    .lean();

  // ✅ Response
  return res
    .status(201)
    .json(new ApiResponse(201, populatedPost, "Post created successfully"));
});

const editPost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const postId = req.params.postId;

  // ✅ Find existing post
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // ✅ Check authorization
  if (post.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to edit this post");
  }

  // ✅ Prepare new content
  if (!content?.trim() && !req.file) {
    throw new ApiError(400, "Post must have at least content or an image");
  }

  let updatedFields = {};

  // ✅ Update content if provided
  if (content?.trim()) {
    updatedFields.content = content.trim();
  }

  // ✅ Handle new image upload (if user changed the image)
  if (req.file?.path) {
    // Delete old image if it existed
    if (post.image) {
      await cloudinaryDelete(post.image);
    }

    const uploadedImage = await cloudinaryUpload(req.file.path);
    if (!uploadedImage?.url) {
      throw new ApiError(500, "Image upload failed, please try again");
    }
    updatedFields.image = uploadedImage.url;
  }

  // ✅ Update the post in DB
  const updatedPost = await Post.findByIdAndUpdate(postId, updatedFields, {
    new: true,
  }).populate("author", "fullname username avatar");

  // ✅ Response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedPost, "Post updated successfully"));
});

const deletePost = asyncHandler(async (req, res) => {
  const postId = req.params.postId

  const post = await Post.findById(postId);
  if(!post){
    throw new ApiError(404, "Post not found");
  }

  // ✅ Check authorization
  if (post.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this post");
  }

  // ✅ Delete post from DB
  await Post.findByIdAndDelete(postId);

  // ✅ Response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Post deleted successfully"));
});

const getPostById = asyncHandler(async (req, res) => {
  const postId = req.params.postId;

  const post = await Post.findById(postId)
    .populate("author", "fullname username avatar")
    .populate("comments.author", "fullname avatar");
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // ✅ Response
  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post fetched successfully"));
});

const getUserFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const sort = req.query.sort || "trending"; // "trending" | "latest" | "top"
  const skip = (page - 1) * limit;

  const followingDocs = await Follow.find({ follower: userId }).select("following");
  const followingIds = followingDocs.map((f) => f.following);
  followingIds.push(userId);

  const sortStage = { isPinned: -1 };
  if (sort === "latest") {
    sortStage.createdAt = -1;
  } else if (sort === "top") {
    sortStage.pulseScore = -1;
    sortStage.createdAt = -1;
  } else {
    // Trending: Hot Gravity Decay prevents old posts from dominating and smooths volatility
    sortStage.trendingScore = -1;
    sortStage.createdAt = -1;
  }

  const feedPosts = await Post.aggregate([
    {
      $match: {
        author: { $in: followingIds },
      },
    },
    // Lookup Author
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    {
      $unwind: "$author",
    },
    // Lookup Re-Pulse source if any
    {
      $lookup: {
        from: "posts",
        localField: "repostedFrom",
        foreignField: "_id",
        as: "repostedFromDoc",
      },
    },
    {
      $unwind: {
        path: "$repostedFromDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup Original Author of Re-Pulse
    {
      $lookup: {
        from: "users",
        localField: "repostedFromDoc.author",
        foreignField: "_id",
        as: "repostedAuthorDoc",
      },
    },
    {
      $unwind: {
        path: "$repostedAuthorDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup how many times this post has been Re-Pulsed across the platform
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "repostedFrom",
        as: "repostsList",
      },
    },
    // Calculate raw metrics & age in hours
    {
      $addFields: {
        signalCount: { $size: { $ifNull: ["$likes", []] } },
        echoCount: { $size: { $ifNull: ["$comments", []] } },
        repulseCount: { $size: { $ifNull: ["$repostsList", []] } },
        pulseScore: {
          $add: [
            { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 3] },
            { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 5] },
            { $multiply: [{ $size: { $ifNull: ["$repostsList", []] } }, 7] },
          ],
        },
        ageInHours: {
          $max: [
            0,
            {
              $divide: [
                { $subtract: [new Date(), "$createdAt"] },
                3600000,
              ],
            },
          ],
        },
      },
    },
    // Gravity-Decayed Trending Score: (pulseScore + 2) / ((ageInHours + 2) ^ 1.4)
    {
      $addFields: {
        trendingScore: {
          $divide: [
            { $add: ["$pulseScore", 2] },
            {
              $pow: [
                { $add: ["$ageInHours", 2] },
                1.4,
              ],
            },
          ],
        },
      },
    },
    // Project final clean document
    {
      $project: {
        _id: 1,
        content: 1,
        image: 1,
        createdAt: 1,
        isPinned: 1,
        likes: 1,
        comments: 1,
        signalCount: 1,
        echoCount: 1,
        repulseCount: 1,
        pulseScore: 1,
        trendingScore: 1,
        hasRepulsed: {
          $in: [req.user._id, { $ifNull: ["$repostsList.author", []] }],
        },
        repostedFrom: {
          $cond: {
            if: { $ne: ["$repostedFromDoc", null] },
            then: {
              _id: "$repostedFromDoc._id",
              content: "$repostedFromDoc.content",
              image: "$repostedFromDoc.image",
              createdAt: "$repostedFromDoc.createdAt",
              author: {
                _id: "$repostedAuthorDoc._id",
                fullname: "$repostedAuthorDoc.fullname",
                username: "$repostedAuthorDoc.username",
                avatar: "$repostedAuthorDoc.avatar",
              },
            },
            else: null,
          },
        },
        "author._id": 1,
        "author.fullname": 1,
        "author.username": 1,
        "author.avatar": 1,
      },
    },
    // Dynamic Sort based on user selected mode
    {
      $sort: sortStage,
    },
    { $skip: skip },
    { $limit: limit },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, feedPosts || [], "User feed fetched successfully"));
});

const getPostsByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const cleanUsername = (username || "").replace(/^@/, "").trim();

  const user = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, "i") } });
  if (!user) throw new ApiError(404, "User not found");

  const posts = await Post.find({
    author: user._id,
    $or: [{ repostedFrom: null }, { repostedFrom: { $exists: false } }],
  })
    .populate("author", "fullname username avatar")
    .sort({ isPinned: -1, createdAt: -1 })
    .lean();

  // Also get repulse counts for each post
  const postIds = posts.map((p) => p._id);
  const repulses = await Post.find({ repostedFrom: { $in: postIds } }).select("repostedFrom author").lean();
  const repulseMap = {};
  repulses.forEach((r) => {
    const origId = r.repostedFrom?.toString();
    if (origId) {
      if (!repulseMap[origId]) repulseMap[origId] = [];
      repulseMap[origId].push(r.author?.toString());
    }
  });

  const currentUserId = req.user?._id ? req.user._id.toString() : null;

  const enrichedPosts = posts.map((post) => {
    const pId = post._id.toString();
    const repostAuthors = repulseMap[pId] || [];
    const signalCount = Array.isArray(post.likes) ? post.likes.length : 0;
    const echoCount = Array.isArray(post.comments) ? post.comments.length : 0;
    const repulseCount = repostAuthors.length;
    const pulseScore = signalCount * 3 + echoCount * 5 + repulseCount * 7;
    const hasRepulsed = currentUserId ? repostAuthors.includes(currentUserId) : false;

    return {
      ...post,
      signalCount,
      echoCount,
      repulseCount,
      pulseScore,
      hasRepulsed,
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, enrichedPosts, "Posts by user fetched successfully"));
});

const getRepulsesByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const cleanUsername = (username || "").replace(/^@/, "").trim();

  const user = await User.findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, "i") } });
  if (!user) throw new ApiError(404, "User not found");

  const repulses = await Post.find({
    author: user._id,
    repostedFrom: { $ne: null },
  })
    .populate("author", "fullname username avatar")
    .populate({
      path: "repostedFrom",
      populate: { path: "author", select: "fullname username avatar" },
    })
    .sort({ createdAt: -1 })
    .lean();

  const originalPostIds = repulses
    .map((r) => r.repostedFrom?._id)
    .filter(Boolean);

  const allReposts = await Post.find({ repostedFrom: { $in: originalPostIds } })
    .select("repostedFrom author")
    .lean();

  const repulseMap = {};
  allReposts.forEach((r) => {
    const origId = r.repostedFrom?.toString();
    if (origId) {
      if (!repulseMap[origId]) repulseMap[origId] = [];
      repulseMap[origId].push(r.author?.toString());
    }
  });

  const currentUserId = req.user?._id ? req.user._id.toString() : null;

  const enrichedRepulses = repulses.map((item) => {
    const orig = item.repostedFrom;
    if (!orig) return item;

    const pId = orig._id?.toString();
    const repostAuthors = (pId && repulseMap[pId]) || [];
    const signalCount = Array.isArray(orig.likes) ? orig.likes.length : 0;
    const echoCount = Array.isArray(orig.comments) ? orig.comments.length : 0;
    const repulseCount = repostAuthors.length;
    const hasRepulsed = currentUserId ? repostAuthors.includes(currentUserId) : false;

    return {
      ...item,
      signalCount,
      echoCount,
      repulseCount,
      hasRepulsed,
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, enrichedRepulses, "User re-pulses fetched successfully"));
});


const getUserAllPosts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const posts = await Post.find({ author: userId })
    .populate("author", "fullname username avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "All user posts fetched successfully"));
});

const togglePinnedPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findOne({ _id: postId, author: req.user._id })
    .populate("author", "fullname username avatar");
  if (!post) throw new ApiError(404, "Post not found or unauthorized");

  post.isPinned = !post.isPinned;
  await post.save();

  return res
    .status(200)
    .json(new ApiResponse(200, post, `Post ${post.isPinned ? "pinned" : "unpinned"} successfully`));
});
 
const repost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // ✅ Find original post
  const originalPost = await Post.findById(postId).populate("author", "fullname username avatar");

  if (!originalPost) {
    throw new ApiError(404, "Original pulse not found");
  }

  // ✅ Prevent self-repost
  if (originalPost.author._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot re-pulse your own pulse");
  }

  // ✅ Check if already re-pulsed -> UN-PULSE!
  const alreadyReposted = await Post.findOne({
    author: req.user._id,
    repostedFrom: originalPost._id,
  });

  if (alreadyReposted) {
    await Post.findByIdAndDelete(alreadyReposted._id);
    return res
      .status(200)
      .json(new ApiResponse(200, { unrepulsed: true, reposted: false }, "Pulse un-repulsed successfully"));
  }

  // ✅ Create re-pulse
  const newRepost = await Post.create({
    author: req.user._id,
    repostedFrom: originalPost._id,
  });

  const populatedRepost = await Post.findById(newRepost._id)
    .populate("author", "fullname username avatar")
    .populate({
      path: "repostedFrom",
      populate: { path: "author", select: "fullname username avatar" },
    });

  // Dispatch System Notification
  if (originalPost.author?._id) {
    sendSystemNotification({
      receiver: originalPost.author._id,
      sender: req.user._id,
      type: "repulse",
      message: `@${req.user.username} re-pulsed and amplified your Pulse across the network 🔁`,
      link: `/profile/${req.user.username}`,
    }).catch((err) => console.error("Notification error:", err.message));
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { unrepulsed: false, reposted: true, repost: populatedRepost }, "Pulse re-pulsed successfully"));
});

export {
  createPost,
  editPost,
  deletePost,
  getPostById,
  getUserFeed,
  getPostsByUsername,
  getRepulsesByUsername,
  getUserAllPosts,
  togglePinnedPost,
  repost,
};