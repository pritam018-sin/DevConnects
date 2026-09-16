import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetUserFeedQuery,
  useCreatePostMutation,
  useDeletePostMutation,
  useTogglePinnedPostMutation,
  useRepostMutation,
} from '../redux/api/postApiSlice.js';
import { useToggleLikeMutation } from '../redux/api/likeApiSlice.js';
import InlineComments from '../components/comments/InlineComments.jsx';
import PulseContent from '../components/PulseContent.jsx';

const Home = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const currentUserId = userInfo?._id || userInfo?.user?._id;

  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Track which pulse has inline comments expanded: { [pulseId]: boolean }
  const [expandedComments, setExpandedComments] = useState({});

  // Optimistic like state for instantaneous UI response: { [pulseId]: { isLiked: boolean, count: number } }
  const [optimisticLikes, setOptimisticLikes] = useState({});

  // Feed algorithm sorting mode: 'trending' (hot gravity decay) | 'latest' (newest first) | 'top' (all-time resonance)
  const [feedMode, setFeedMode] = useState('trending');

  const { data, isLoading, isError, refetch } = useGetUserFeedQuery(
    { page: 1, limit: 20, sort: feedMode },
    { skip: !userInfo }
  );

  const [createPost, { isLoading: isPosting }] = useCreatePostMutation();
  const [toggleLike] = useToggleLikeMutation();
  const [deletePost] = useDeletePostMutation();
  const [togglePinnedPost] = useTogglePinnedPostMutation();
  const [repost] = useRepostMutation();

  const rawPosts = data?.data ?? data?.message ?? data;
  const posts = Array.isArray(rawPosts) ? rawPosts : [];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!userInfo) {
      toast.error('Please sign in to broadcast a pulse');
      navigate('/login');
      return;
    }

    if (!content.trim() && !imageFile) {
      toast.error('Please write a message or attach media for your pulse');
      return;
    }

    const formData = new FormData();
    if (content.trim()) formData.append('content', content.trim());
    if (imageFile) formData.append('image', imageFile);

    try {
      await createPost(formData).unwrap();
      setContent('');
      handleRemoveImage();
      toast.success('Pulse broadcasted to the network! 🚀');
    } catch (err) {
      console.error('Pulse creation error:', err);
      toast.error(err?.data?.message || 'Failed to broadcast pulse');
    }
  };

  const handleLike = async (post) => {
    if (!userInfo) {
      toast.error('Please sign in to boost pulses');
      return;
    }

    const initialLiked =
      optimisticLikes[post._id]?.isLiked ??
      (currentUserId && Array.isArray(post.likes) && post.likes.some(id => String(id) === String(currentUserId)));
    const currentCount =
      optimisticLikes[post._id]?.count ??
      (Array.isArray(post.likes) ? post.likes.length : 0);

    const nextLiked = !initialLiked;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    // Instant optimistic update
    setOptimisticLikes((prev) => ({
      ...prev,
      [post._id]: { isLiked: nextLiked, count: nextCount },
    }));

    try {
      await toggleLike({ parentId: post._id, parentType: 'Post' }).unwrap();
    } catch (err) {
      // Revert on failure
      setOptimisticLikes((prev) => ({
        ...prev,
        [post._id]: { isLiked: initialLiked, count: currentCount },
      }));
      toast.error('Could not boost pulse');
    }
  };

  const handleRepost = async (postId) => {
    if (!userInfo) {
      toast.error('Please sign in to re-pulse');
      return;
    }
    try {
      const res = await repost(postId).unwrap();
      const payload = res?.data || res;
      if (payload?.unrepulsed) {
        toast.success('Pulse un-repulsed');
      } else {
        toast.success('Pulse re-pulsed to your network!');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Could not re-pulse');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this pulse?')) return;
    try {
      await deletePost(postId).unwrap();
      toast.success('Pulse removed');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete pulse');
    }
  };

  const handleTogglePin = async (postId) => {
    try {
      const res = await togglePinnedPost(postId).unwrap();
      toast.success(res?.message || 'Pulse pin updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to pin pulse');
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  return (
    <>
      {/* Sleek Code Editor Input Area - New Pulse */}
      <section className="glass-card rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_40px_rgba(106,91,205,0.15)]">
        <div className="bg-primary/10 px-4 py-2.5 border-b border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
            </div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-primary ml-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">sensors</span>
              <span>New Pulse</span>
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">
            broadcast_pulse.tsx
          </span>
        </div>
        <form onSubmit={handleCreatePost} className="p-5 flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex flex-col text-slate-600 text-xs select-none font-mono pr-4 border-r border-slate-800">
              <span>01</span>
              <span>02</span>
              <span>03</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 text-slate-200 font-mono text-sm placeholder:text-slate-600 resize-none h-24 outline-none"
              placeholder="// Broadcast your latest breakthrough, code commit, or technical insight..."
            />
          </div>

          {/* Media Preview */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-64 w-fit ml-8">
              <img src={imagePreview} alt="Attached" className="max-h-64 object-cover rounded-xl" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-red-500 transition"
                title="Remove media"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-3">
            <div className="flex gap-2 items-center">
              <label className="p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-primary transition cursor-pointer flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-[20px]">image</span>
              </label>
              <button
                type="button"
                onClick={() => setContent((prev) => prev + '\n```javascript\n// code snippet\n```\n')}
                className="p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-primary transition"
                title="Insert snippet"
              >
                <span className="material-symbols-outlined text-[20px]">code</span>
              </button>
            </div>
            <button
              type="submit"
              disabled={isPosting}
              className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-6 py-2.5 rounded-full font-bold text-xs tracking-wide flex items-center gap-2 transition shadow-[0_0_20px_rgba(106,91,205,0.4)]"
            >
              <span>{isPosting ? 'Broadcasting...' : 'Broadcast Pulse'}</span>
              <span className="material-symbols-outlined text-sm">sensors</span>
            </button>
          </div>
        </form>
      </section>

      {/* Pulse Stream Filter & Algorithm Sort Modes */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        {/* Sort Modes */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
          <button
            onClick={() => setFeedMode('trending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              feedMode === 'trending'
                ? 'bg-gradient-to-r from-amber-500/20 to-primary/20 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Trending: Gravity-decayed resonance gives new pulses visibility while factoring engagement"
          >
            <span className="material-symbols-outlined text-sm text-amber-400">local_fire_department</span>
            <span>Trending</span>
          </button>

          <button
            onClick={() => setFeedMode('latest')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              feedMode === 'latest'
                ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(106,91,205,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Latest: Real-time chronological order, every new pulse appears first"
          >
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>Latest</span>
          </button>

          <button
            onClick={() => setFeedMode('top')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              feedMode === 'top'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Top: All-time highest resonance score"
          >
            <span className="material-symbols-outlined text-sm text-purple-400">workspace_premium</span>
            <span>Top Resonance</span>
          </button>
        </div>

        {/* Platform Shortcuts */}
        <div className="flex gap-2">
          <Link
            to="/projects"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900/70 text-slate-400 border border-slate-800 hover:border-slate-700 font-semibold text-xs whitespace-nowrap transition flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">layers</span>
            <span>Projects</span>
          </Link>
          <Link
            to="/network"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900/70 text-slate-400 border border-slate-800 hover:border-slate-700 font-semibold text-xs whitespace-nowrap transition flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-xs">group</span>
            <span>Engineers</span>
          </Link>
        </div>
      </div>

      {/* Pulses Stream */}
      <div className="flex flex-col gap-6">
        {!userInfo ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-primary">sensors</span>
            <div>
              <h3 className="text-lg font-bold text-white">Join the DevConnect Pulse</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Connect with world-class engineers, share technical insights, and showcase your latest codebases.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Link
                to="/login"
                className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-6 py-2.5 rounded-full transition shadow-[0_0_20px_rgba(106,91,205,0.4)]"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-6 py-2.5 rounded-full transition"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-16 text-slate-500 text-sm">
            <span className="material-symbols-outlined animate-spin mr-2">sync</span>
            Synchronizing pulse stream...
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center border border-slate-800 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-slate-600">forum</span>
            <h3 className="text-base font-bold text-slate-300">Your stream is quiet</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Connect with engineers to see their technical pulses, or broadcast your first pulse above.
            </p>
            <Link
              to="/network"
              className="mt-2 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold text-xs px-5 py-2.5 rounded-full transition"
            >
              Explore Engineer Mesh
            </Link>
          </div>
        ) : (
          posts.map((post) => {
            const isRepulse = Boolean(post.repostedFrom && post.repostedFrom._id);
            const originalPost = isRepulse ? post.repostedFrom : post;
            const author = originalPost.author || {};
            const repulser = isRepulse ? post.author : null;

            const isOwnPost =
              currentUserId &&
              author._id &&
              String(author._id) === String(currentUserId);

            const isOwnRepulse =
              isRepulse &&
              currentUserId &&
              repulser?._id &&
              String(repulser._id) === String(currentUserId);

            // Target for liking / commenting / repulsing
            const targetPostId = originalPost._id || post._id;

            // Compute like state for original pulse with optimistic overrides
            const isLiked =
              optimisticLikes[targetPostId]?.isLiked ??
              (currentUserId &&
                Array.isArray(originalPost.likes) &&
                originalPost.likes.some((id) => String(id) === String(currentUserId)));

            const likeCount =
              optimisticLikes[targetPostId]?.count ??
              (originalPost.signalCount ?? (Array.isArray(originalPost.likes) ? originalPost.likes.length : 0));

            const echoCount =
              originalPost.echoCount ?? (Array.isArray(originalPost.comments) ? originalPost.comments.length : 0);

            const repulseCount = originalPost.repulseCount ?? post.repulseCount ?? 0;
            const pulseScore = post.pulseScore ?? originalPost.pulseScore ?? 0;
            const trendingScore = post.trendingScore ?? originalPost.trendingScore ?? null;
            const hasRepulsed = Boolean(post.hasRepulsed || isOwnRepulse);

            const isCommentsOpen = Boolean(expandedComments[targetPostId]);

            return (
              <article
                key={post._id}
                className="glass-card rounded-2xl p-6 flex flex-col gap-4 border border-slate-800/80 hover:border-primary/40 transition-all duration-300 shadow-sm"
              >
                {/* Re-Pulse Top Banner */}
                {isRepulse && repulser && (
                  <div className="flex items-center justify-between text-xs text-secondary font-medium pb-2 border-b border-slate-800/40">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">repeat</span>
                      <Link to={`/profile/${repulser.username}`} className="hover:underline font-bold">
                        @{repulser.username}
                      </Link>
                      <span>re-pulsed</span>
                    </div>
                    {isOwnRepulse && (
                      <button
                        onClick={() => handleRepost(targetPostId)}
                        className="text-[11px] text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Un-Pulse"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                        Un-Pulse
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Link
                    to={`/profile/${author.username}`}
                    className="flex items-center gap-3 group"
                  >
                    <img
                      src={author.avatar || 'https://via.placeholder.com/48'}
                      alt={author.username || 'author'}
                      className="w-11 h-11 rounded-xl object-cover border border-slate-700 group-hover:border-primary transition"
                    />
                    <div>
                      <h3 className="font-bold text-slate-100 group-hover:text-primary transition text-sm">
                        {author.fullname || author.username}
                        <span className="text-xs font-normal text-slate-500 ml-2">
                          • {new Date(originalPost.createdAt || post.createdAt).toLocaleDateString()}
                        </span>
                      </h3>
                      <p className="text-xs text-secondary font-medium">
                        @{author.username}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2">
                    {/* Algorithmic Pulse Resonance & Trending Score */}
                    {feedMode === 'trending' && trendingScore !== null ? (
                      <div
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-[11px] font-mono font-medium text-amber-300 select-none"
                        title={`Gravity Trending Velocity: ${Number(trendingScore).toFixed(2)} | Raw Score: ${pulseScore} pts (Signals ×3, Echoes ×5, Re-Pulses ×7, decayed by age)`}
                      >
                        <span className="material-symbols-outlined text-xs text-amber-400">local_fire_department</span>
                        <span>{Number(trendingScore).toFixed(2)} Velocity</span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/10 to-primary/10 border border-purple-500/25 text-[11px] font-mono font-medium text-purple-300 select-none"
                        title={`Total Resonance: ${pulseScore} pts (Signals ×3, Echoes ×5, Re-Pulses ×7)`}
                      >
                        <span className="material-symbols-outlined text-xs text-purple-400">bolt</span>
                        <span>{pulseScore} Resonance</span>
                      </div>
                    )}

                    {originalPost.isPinned && (
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">push_pin</span>
                        Pinned
                      </span>
                    )}

                    {isOwnPost && !isRepulse && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePin(originalPost._id)}
                          className="text-slate-500 hover:text-primary p-1 transition"
                          title="Pin / Unpin pulse"
                        >
                          <span className="material-symbols-outlined text-sm">push_pin</span>
                        </button>
                        <button
                          onClick={() => handleDelete(originalPost._id)}
                          className="text-slate-500 hover:text-red-400 p-1 transition"
                          title="Delete pulse"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {originalPost.content && (
                  <PulseContent content={originalPost.content} />
                )}

                {originalPost.image && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 max-h-[450px]">
                    <img
                      src={originalPost.image}
                      alt="Pulse visual"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center gap-6 mt-1 pt-2 border-t border-slate-800/40">
                  {/* Signal Boost (Like) */}
                  <button
                    onClick={() => handleLike(originalPost)}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-125 ${
                      isLiked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400'
                    }`}
                    title="Signal Boost"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isLiked ? 'favorite' : 'favorite_border'}
                    </span>
                    <span>{likeCount} {likeCount === 1 ? 'Signal' : 'Signals'}</span>
                  </button>

                  {/* Discussion Echoes */}
                  <button
                    onClick={() => toggleComments(targetPostId)}
                    className={`flex items-center gap-1.5 transition-all text-xs font-bold ${
                      isCommentsOpen
                        ? 'text-primary'
                        : 'text-slate-400 hover:text-primary'
                    }`}
                    title="Discussion Echoes"
                  >
                    <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                    <span>{echoCount} {echoCount === 1 ? 'Echo' : 'Echoes'}</span>
                  </button>

                  {/* Re-Pulse / Un-Pulse Button */}
                  <button
                    onClick={() => handleRepost(targetPostId)}
                    className={`flex items-center gap-1.5 transition-all text-xs font-bold active:rotate-180 ${
                      hasRepulsed
                        ? 'text-secondary hover:text-secondary/80'
                        : 'text-slate-400 hover:text-secondary'
                    }`}
                    title={hasRepulsed ? 'Un-Pulse' : 'Re-Pulse'}
                  >
                    <span className="material-symbols-outlined text-[20px]">repeat</span>
                    <span>
                      {hasRepulsed ? 'Un-Pulse' : 'Re-Pulse'}
                      {repulseCount > 0 ? ` (${repulseCount})` : ''}
                    </span>
                  </button>
                </div>

                {/* Inline Expandable Comments Section (No Card/Modal Popup!) */}
                {isCommentsOpen && (
                  <InlineComments parentId={targetPostId} parentType="Post" />
                )}
              </article>
            );
          })
        )}
      </div>
    </>
  );
};

export default Home;