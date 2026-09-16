import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useReplyToCommentMutation,
  useToggleCommentLikeMutation,
  useDeleteCommentMutation,
} from "../../redux/api/commentApiSlice.js";

const InlineComments = ({ parentId, parentType = "Post" }) => {
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

  const rawComments = data?.data ?? data?.message ?? data;
  const comments = Array.isArray(rawComments) ? rawComments : [];

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
      toast.success("Comment posted!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to post comment");
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
      toast.success("Reply posted!");
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
    <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
      {/* Input Box */}
      {userInfo ? (
        <form onSubmit={handleCreateComment} className="flex items-center gap-2">
          <img
            src={userInfo.avatar || "https://via.placeholder.com/32"}
            alt="You"
            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
          />
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts on this pulse..."
            className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-primary transition placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !commentText.trim()}
            className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 shadow-[0_0_15px_rgba(106,91,205,0.3)]"
          >
            <span>Comment</span>
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-slate-500">Sign in to leave a comment on this pulse.</p>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {isLoading ? (
          <div className="text-center py-4 text-xs text-slate-500">Loading discussion...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">
            No comments yet. Start the conversation!
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
              <div key={comment._id} className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <Link to={`/profile/${comment.author?.username}`}>
                    <img
                      src={comment.author?.avatar || "https://via.placeholder.com/32"}
                      alt={comment.author?.username}
                      className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0 mt-0.5 hover:border-primary transition"
                    />
                  </Link>
                  <div className="flex-1 bg-slate-900/60 rounded-xl p-3 border border-slate-800/70">
                    <div className="flex items-center justify-between mb-1">
                      <Link
                        to={`/profile/${comment.author?.username}`}
                        className="font-bold text-slate-200 hover:text-primary transition"
                      >
                        {comment.author?.fullname || comment.author?.username}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        {isAuthor && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-slate-500 hover:text-red-400 p-0.5 transition"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed break-words">{comment.content}</p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                      <button
                        onClick={() => handleToggleLike(comment._id)}
                        className={`flex items-center gap-1 transition-colors ${
                          isLiked ? "text-pink-500" : "hover:text-pink-400"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isLiked ? "favorite" : "favorite_border"}
                        </span>
                        <span>{comment.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() =>
                          setReplyingToId(replyingToId === comment._id ? null : comment._id)
                        }
                        className="hover:text-primary transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">reply</span>
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Reply input */}
                {replyingToId === comment._id && (
                  <div className="ml-9 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to @${comment.author?.username}...`}
                      className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-primary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleReply(comment._id);
                      }}
                    />
                    <button
                      onClick={() => handleReply(comment._id)}
                      disabled={isReplying}
                      className="bg-primary hover:bg-primary/80 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition"
                    >
                      Send
                    </button>
                  </div>
                )}

                {/* Nested Replies */}
                {comment.replies?.length > 0 && (
                  <div className="ml-9 space-y-2 border-l border-slate-800 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply._id} className="flex items-start gap-2">
                        <Link to={`/profile/${reply.author?.username}`}>
                          <img
                            src={reply.author?.avatar || "https://via.placeholder.com/28"}
                            alt={reply.author?.username}
                            className="w-5 h-5 rounded-full object-cover border border-slate-700 mt-0.5 hover:border-primary transition"
                          />
                        </Link>
                        <div className="flex-1 bg-slate-950/70 rounded-lg p-2 border border-slate-800/60">
                          <div className="flex items-center justify-between mb-0.5">
                            <Link
                              to={`/profile/${reply.author?.username}`}
                              className="font-bold text-[11px] text-slate-300 hover:text-primary transition"
                            >
                              {reply.author?.fullname || reply.author?.username}
                            </Link>
                            <span className="text-[9px] text-slate-500">
                              {new Date(reply.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">{reply.content}</p>
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
    </div>
  );
};

export default InlineComments;
