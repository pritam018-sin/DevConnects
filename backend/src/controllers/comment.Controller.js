import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Post } from "../models/post.Model.js";
import { User } from "../models/user.Model.js";
import { Comment } from "../models/comment.Model.js";
import { Project } from "../models/project.Model.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";

const createComment = asyncHandler(async (req, res) => {
  const { parentId, parentType, content, parentComment } = req.body;

  // ✅ Validation
  if (!content?.trim()) {
    throw new ApiError(400, "Comment content cannot be empty");
  }
  if (!["Post", "Project"].includes(parentType)) {
    throw new ApiError(400, "Invalid parent type");
  }
  // ✅ Verify parent existence
  const parentDoc =
    parentType === "Post"
      ? await Post.findById(parentId)
      : await Project.findById(parentId);

  if (!parentDoc) {
    throw new ApiError(404, `${parentType} not found`);
  }

  const comment = await Comment.create({
    parentId,
    parentType,
    author: req.user.id,
    content: content.trim(),
    parentComment: parentComment || null,
  });

  // Add to parent’s comments array (optional)
  if (parentType === "Post") {
    parentDoc.comments.push(comment._id);
  } else {
    parentDoc.comments.push(comment._id);
  }
  await parentDoc.save();

  const populatedComment = await Comment.findById(comment._id).populate(
    "author",
    "fullname username avatar"
  );

  // Dispatch System Notification
  const receiverId = parentDoc.author || parentDoc.owner;
  if (receiverId) {
    const trimmedSnippet = content.trim().slice(0, 35) + (content.trim().length > 35 ? "..." : "");
    sendSystemNotification({
      receiver: receiverId,
      sender: req.user._id,
      type: "comment",
      message: `@${req.user.username} echoed in your ${parentType} discussion: "${trimmedSnippet}" 💬`,
      link: parentType === "Post" ? "/" : "/projects",
    }).catch((err) => console.error("Notification error:", err.message));
  }

  res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment added successfully"));
});

const replyToComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) throw new ApiError(400, "Reply content required");

  const parentComment = await Comment.findById(commentId);
  if (!parentComment) throw new ApiError(404, "Parent comment not found");

  const reply = await Comment.create({
    parentId: parentComment.parentId,
    parentType: parentComment.parentType,
    author: req.user.id,
    content: content.trim(),
    parentComment: commentId,
  });

  parentComment.replies.push(reply._id);
  await parentComment.save();

  const populatedReply = await Comment.findById(reply._id).populate(
    "author",
    "fullname username avatar"
  );

  // Dispatch System Notification for Reply
  if (parentComment.author) {
    const trimmedSnippet = content.trim().slice(0, 35) + (content.trim().length > 35 ? "..." : "");
    sendSystemNotification({
      receiver: parentComment.author,
      sender: req.user._id,
      type: "reply",
      message: `@${req.user.username} replied to your discussion thread: "${trimmedSnippet}" 💬`,
      link: "/",
    }).catch((err) => console.error("Notification error:", err.message));
  }

  res
    .status(201)
    .json(new ApiResponse(201, populatedReply, "Reply added successfully"));
});

const getComments = asyncHandler(async (req, res) => {
  const { parentId, parentType } = req.query;

  if (!["Post", "Project"].includes(parentType))
    throw new ApiError(400, "Invalid parent type");

  const comments = await Comment.find({
    parentId,
    parentType,
    parentComment: null, // only top-level comments
  })
    .populate("author", "fullname username avatar")
    .populate({
      path: "replies",
      populate: {
        path: "author",
        select: "fullname username avatar",
      },
    })
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  const userId = req.user._id;
  const alreadyLiked = comment.likes.includes(userId);

  if (alreadyLiked) {
    comment.likes.pull(userId);
  } else {
    comment.likes.push(userId);
  }

  await comment.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { liked: !alreadyLiked, totalLikes: comment.likes.length },
        alreadyLiked ? "Comment unliked" : "Comment liked"
      )
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // 1️⃣ Find the comment
 
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  // 2️⃣ Check if user is the author
  if (comment.author._id.toString() !== req.user._id.toString())
    throw new ApiError(403, "You are not authorized to delete this comment");

  // 3️⃣ Option A: Recursive delete of replies
  const deleteReplies = async (comment) => {
    if (comment.replies.length > 0) {
      for (const replyId of comment.replies) {
        const reply = await Comment.findById(replyId);
        if (reply) await deleteReplies(reply);
        await Comment.findByIdAndDelete(replyId);
      }
    }
  };

  await deleteReplies(comment);

  // 4️⃣ Delete the main comment
  await comment.deleteOne();

  // 5️⃣ Return success
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment and its replies deleted successfully"));
});



export {
    createComment,
    replyToComment,
    getComments,
    toggleCommentLike,
    deleteComment,
};