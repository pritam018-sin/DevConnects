import React, { useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useReplyToCommentMutation,
  useToggleCommentLikeMutation,
  useDeleteCommentMutation,
} from "../../redux/api/commentApiSlice.js";

const CommentsModal = ({ parentId, parentType = "Post", onClose }) => {
  const { userInfo } = useSelector((state) => state.auth);
  const currentUserId = userInfo?._id || userInfo?.user?._id;

  const [commentText, setCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading } = useGetCommentsQuery({ parentId, parentType });
  const [createComment, { isLoading: isSubmitting }] = useCreateCommentMutation();
  const [replyToComment, { isLoading: isReplying }] = useReplyToCommentMutation();
  const [toggleCommentLike] = useToggleCommentLikeMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const comments = data?.data || [];

  const handleCreateComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await createComment({
        parentId,
        parentType,
        content: commentText.trim(),
      }).unwrap();
      setCommentText("");
      toast.success("Comment added!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add comment");
    }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;

    try {
      await replyToComment({
        commentId,
        content: replyText.trim(),
        parentId,
      }).unwrap();
      setReplyText("");
      setReplyingToId(null);
      toast.success("Reply added!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to post reply");
    }
  };

  const handleToggleLike = async (commentId) => {
    try {
      await toggleCommentLike({ commentId, parentId }).unwrap();
    } catch (err) {
      toast.error("Could not update like");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment({ commentId, parentId }).unwrap();
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete comment");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark/95 border border-primary/20 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-[0_0_60px_rgba(106,91,205,0.2)] overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">chat</span>
            <h3 className="text-lg font-bold text-white">
              Discussion ({comments.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center py-12 text-slate-500">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">forum</span>
              <p>No comments yet. Be the first to start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isAuthor =
                currentUserId &&
                comment.author?._id &&
                String(comment.author._id) === String(currentUserId);
              const isLiked =
                currentUserId &&
                comment.likes?.includes(currentUserId);

              return (
                <div key={comment._id} className="space-y-3">
                  <div className="flex items-start gap-3 group">
                    <img
                      src={comment.author?.avatar || "https://via.placeholder.com/40"}
                      alt={comment.author?.username}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 mt-0.5"
                    />
                    <div className="flex-1 bg-slate-900/80 rounded-2xl p-4 border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-200">
                          {comment.author?.fullname || comment.author?.username}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                          {isAuthor && (
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className="text-slate-500 hover:text-red-400 transition-colors p-1"
                              title="Delete comment"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed break-words">
                        {comment.content}
                      </p>

                      <div className="mt-3 flex items-center gap-4 text-xs font-semibold">
                        <button
                          onClick={() => handleToggleLike(comment._id)}
                          className={`flex items-center gap-1 transition-colors ${
                            isLiked ? "text-pink-500" : "text-slate-400 hover:text-pink-400"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isLiked ? "favorite" : "favorite_border"}
                          </span>
                          <span>{comment.likes?.length || 0}</span>
                        </button>
                        <button
                          onClick={() =>
                            setReplyingToId(
                              replyingToId === comment._id ? null : comment._id
                            )
                          }
                          className="text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">reply</span>
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reply Input */}
                  {replyingToId === comment._id && (
                    <div className="ml-12 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to @${comment.author?.username}...`}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-primary"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleReply(comment._id);
                        }}
                      />
                      <button
                        onClick={() => handleReply(comment._id)}
                        disabled={isReplying}
                        className="bg-primary hover:bg-primary/80 px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  )}

                  {/* Replies List */}
                  {comment.replies?.length > 0 && (
                    <div className="ml-12 space-y-3 border-l-2 border-slate-800 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply._id} className="flex items-start gap-3">
                          <img
                            src={reply.author?.avatar || "https://via.placeholder.com/32"}
                            alt={reply.author?.username}
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 mt-0.5"
                          />
                          <div className="flex-1 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-300">
                                {reply.author?.fullname || reply.author?.username}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add Comment Input Footer */}
        {userInfo ? (
          <form
            onSubmit={handleCreateComment}
            className="p-4 border-t border-slate-800 bg-background-dark flex gap-3 items-center"
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-primary transition"
            />
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-bold text-sm px-5 py-3 rounded-xl transition flex items-center gap-1"
            >
              <span>Send</span>
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </form>
        ) : (
          <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500">
            Sign in to join the conversation.
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsModal;
