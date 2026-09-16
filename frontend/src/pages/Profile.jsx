import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  useGetUserProfileQuery,
  useUpdateAvatarMutation,
  useUpdateCoverMutation,
} from "../redux/api/userApiSlice.js";
import {
  useGetPostsByUsernameQuery,
  useGetRepulsesByUsernameQuery,
  useEditPostMutation,
  useDeletePostMutation,
  useTogglePinnedPostMutation,
  useRepostMutation,
} from "../redux/api/postApiSlice.js";
import { useGetProjectsByUsernameQuery } from "../redux/api/projectApiSlice.js";
import { useToggleFollowMutation, useGetFollowingQuery } from "../redux/api/followApiSlice.js";
import { useToggleLikeMutation } from "../redux/api/likeApiSlice.js";
import { setCredentials } from "../redux/feature/auth/authSlice.js";
import EditProfileModal from "../components/profile/EditProfileModal.jsx";
import FollowListModal from "../components/profile/FollowListModal.jsx";
import GitHubShowcase from "../components/profile/GitHubShowcase.jsx";
import InlineComments from "../components/comments/InlineComments.jsx";
import PulseContent from "../components/PulseContent.jsx";

const Profile = () => {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.auth);
  const loggedInUsername = (userInfo?.username || userInfo?.user?.username || "").replace(/^@/, "").trim();
  const cleanRouteUsername = (routeUsername || "").replace(/^@/, "").trim();
  const username = cleanRouteUsername || loggedInUsername;

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "projects" | "about"
  const [followModal, setFollowModal] = useState(null); // { type: "followers" | "following" } | null

  // Fetch the profile data
  const { data, isLoading, isError, error, refetch } = useGetUserProfileQuery(
    username || "",
    { skip: !username }
  );

  const profile = data?.data || {};
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const loggedInUserId = userInfo?._id || userInfo?.user?._id;
  const currentProfileId = profile?._id || profile?.user?._id;
  const isOwnProfile = Boolean(
    (loggedInUsername && username && loggedInUsername.toLowerCase() === username.toLowerCase()) ||
    (loggedInUserId && currentProfileId && String(loggedInUserId) === String(currentProfileId))
  );

  // Mutations
  const [updateAvatar, { isLoading: isUploadingAvatar }] = useUpdateAvatarMutation();
  const [updateCover, { isLoading: isUploadingCover }] = useUpdateCoverMutation();
  const [toggleFollow] = useToggleFollowMutation();
  const [toggleLikeMutation] = useToggleLikeMutation();
  const [editPostMutation] = useEditPostMutation();
  const [deletePostMutation] = useDeletePostMutation();
  const [togglePinnedPostMutation] = useTogglePinnedPostMutation();
  const [repostMutation] = useRepostMutation();

  // Optimistic states & menu toggles
  const [optimisticLikes, setOptimisticLikes] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.pulse-menu-container')) {
        setOpenMenuPostId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if current user is following this profile
  const { data: myFollowingData } = useGetFollowingQuery(loggedInUserId, { skip: !loggedInUserId });
  const isFollowing = (myFollowingData?.data || []).some(
    (f) => String(f.following?._id) === String(currentProfileId)
  );

  // Queries for user posts and projects
  const { data: userPostsData, isLoading: loadingPosts, refetch: refetchPosts } = useGetPostsByUsernameQuery(username, {
    skip: !username,
  });
  const { data: userProjectsData, isLoading: loadingProjects } = useGetProjectsByUsernameQuery(
    username,
    { skip: !username }
  );
  const { data: userRepulsesData, isLoading: loadingRepulses, refetch: refetchRepulses } = useGetRepulsesByUsernameQuery(
    username,
    { skip: !username }
  );

  const rawPosts = userPostsData?.data ?? userPostsData?.message ?? userPostsData;
  const posts = Array.isArray(rawPosts)
    ? rawPosts.filter((p) => (p.content && p.content.trim()) || p.image)
    : [];

  const rawProjects = userProjectsData?.data ?? userProjectsData?.message ?? userProjectsData;
  const projects = Array.isArray(rawProjects) ? rawProjects : [];

  const rawRepulses = userRepulsesData?.data ?? userRepulsesData?.message ?? userRepulsesData;
  const repulses = Array.isArray(rawRepulses) ? rawRepulses : [];

  const totalSignalsReceived = posts.reduce((acc, p) => {
    return acc + (p.signalCount ?? (Array.isArray(p.likes) ? p.likes.length : 0));
  }, 0);

  const totalRepulsesReceived = posts.reduce((acc, p) => {
    return acc + (p.repulseCount ?? 0);
  }, 0);

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleLike = async (postId, currentLikeCount, currentIsLiked) => {
    if (!userInfo) {
      toast.error("Please sign in to boost pulses");
      navigate("/login");
      return;
    }
    const nextIsLiked = !currentIsLiked;
    const nextCount = nextIsLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1);
    setOptimisticLikes((prev) => ({
      ...prev,
      [postId]: { isLiked: nextIsLiked, count: nextCount },
    }));
    try {
      await toggleLikeMutation({ parentId: postId, parentType: "Post" }).unwrap();
    } catch (err) {
      setOptimisticLikes((prev) => ({
        ...prev,
        [postId]: { isLiked: currentIsLiked, count: currentLikeCount },
      }));
      toast.error(err?.data?.message || "Failed to signal boost");
    }
  };

  const handleRepost = async (postId) => {
    if (!userInfo) {
      toast.error("Please sign in to re-pulse");
      navigate("/login");
      return;
    }
    try {
      const res = await repostMutation(postId).unwrap();
      toast.success(res?.message || "Pulse shared across the network!");
    } catch (err) {
      toast.error(err?.data?.message || "Re-pulse action failed");
    }
  };

  const handleStartEdit = (post) => {
    setEditingPost(post);
    setEditContent(post.content || "");
    setOpenMenuPostId(null);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error("Pulse content cannot be empty");
      return;
    }
    setIsSavingEdit(true);
    try {
      await editPostMutation({
        postId: editingPost._id,
        data: { content: editContent.trim() },
      }).unwrap();
      toast.success("Pulse updated successfully! 🚀");
      setEditingPost(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update pulse");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this pulse?")) return;
    try {
      await deletePostMutation(postId).unwrap();
      toast.success("Pulse deleted");
      setOpenMenuPostId(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete pulse");
    }
  };

  const handleTogglePin = async (postId) => {
    try {
      const res = await togglePinnedPostMutation(postId).unwrap();
      toast.success(res?.message || "Pulse pin status updated");
      setOpenMenuPostId(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to pin pulse");
    }
  };

  const coverImage =
    profile.coverImage ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80";
  const avatar =
    profile.avatar || "https://via.placeholder.com/160?text=Avatar";
  const joinedAt = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Unknown";

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await updateAvatar(formData).unwrap();
      const newAvatarUrl = res.data?.avatar || res.avatar;
      dispatch(
        setCredentials({
          user: { ...userInfo, avatar: newAvatarUrl },
          accessToken: userInfo?.accessToken,
          refreshToken: userInfo?.refreshToken,
        })
      );
      toast.success("Avatar updated!");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update avatar");
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("coverImage", file);

    try {
      const res = await updateCover(formData).unwrap();
      const newCoverUrl = res.data?.coverImage || res.coverImage;
      dispatch(
        setCredentials({
          user: { ...userInfo, coverImage: newCoverUrl },
          accessToken: userInfo?.accessToken,
          refreshToken: userInfo?.refreshToken,
        })
      );
      toast.success("Cover image updated!");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update cover");
    }
  };

  const handleFollowToggle = async () => {
    if (!userInfo) {
      toast.error("Please sign in to connect");
      navigate("/login");
      return;
    }
    try {
      await toggleFollow(currentProfileId).unwrap();
      refetch();
      toast.success(isFollowing ? "Disconnected" : "Connected!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update connection");
    }
  };

  const handleEditSave = (updatedUserData) => {
    dispatch(
      setCredentials({
        user: { ...(userInfo?.user || userInfo), ...updatedUserData },
        accessToken: userInfo?.accessToken,
        refreshToken: userInfo?.refreshToken,
      })
    );
    toast.success("Profile saved successfully!");
    if (updatedUserData?.username && updatedUserData.username !== username) {
      navigate(`/profile/${updatedUserData.username}`);
    } else {
      refetch();
    }
  };

  if (!username) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto mt-12 border border-slate-800 flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-5xl text-primary">account_circle</span>
        <h2 className="text-xl font-bold text-white">Sign in to View Profile</h2>
        <p className="text-xs text-slate-400 max-w-xs">
          Sign in to access your personal pulses, showcase projects, and connect with fellow builders.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs px-6 py-2.5 rounded-full transition shadow-[0_0_20px_rgba(106,91,205,0.4)]"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        Loading profile...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-3xl bg-slate-950/80 border border-primary/20 shadow-lg text-slate-300">
        <h2 className="text-2xl font-bold text-white mb-3">Profile Unavailable</h2>
        <p className="text-slate-400 mb-4">
          {error?.data?.message || "Could not load this profile right now."}
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
          onClick={() => navigate("/")}
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page space-y-8">
      {/* Cover and Avatar Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <div className="relative h-[320px] w-full">
          <img
            src={coverImage}
            alt={`${profile.username} cover`}
            className="h-full w-full object-cover brightness-[0.7]"
          />
          {isOwnProfile && (
            <label className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md">
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              <span>{isUploadingCover ? "Uploading..." : "Change Cover"}</span>
            </label>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-transparent pointer-events-none" />

        <div className="absolute inset-x-0 bottom-0 px-8 pb-8 pointer-events-auto">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="flex items-end gap-5">
              <div className="relative h-32 w-32 sm:h-36 sm:w-36 overflow-hidden rounded-[2rem] border-4 border-background-dark bg-slate-900 shadow-2xl group">
                <img
                  src={avatar}
                  alt={`${profile.username} avatar`}
                  className="h-full w-full object-cover"
                />
                {isOwnProfile && (
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-xl">photo_camera</span>
                    <span className="text-[10px] font-bold mt-1">
                      {isUploadingAvatar ? "..." : "Change"}
                    </span>
                  </label>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {profile.fullname || profile.username}
                  </h1>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-200">
                    @{profile.username}
                  </span>
                </div>
                <p className="max-w-2xl text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {profile.bio || "Building impact, sharing ideas, and connecting with creators across DevConnect."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end">
              {isOwnProfile ? (
                <button
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white transition hover:bg-primary/90 shadow-[0_0_20px_rgba(106,91,205,0.4)]"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFollowToggle}
                    className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-bold transition ${
                      isFollowing
                        ? "bg-slate-800 text-slate-300 hover:bg-red-500/20 hover:text-red-400"
                        : "bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(106,91,205,0.4)]"
                    }`}
                  >
                    {isFollowing ? "Connected" : "Connect"}
                  </button>

                  <button
                    onClick={() => navigate(`/messages?userId=${currentProfileId}`)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 text-xs font-bold transition border border-slate-700/60 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">podcasts</span>
                    <span>Transmit</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div
          onClick={() => setFollowModal({ type: "followers" })}
          className="rounded-2xl bg-slate-950/80 p-4 text-center border border-slate-800 shadow-sm cursor-pointer hover:border-primary/50 transition"
        >
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Connections</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{profile.followersCount ?? 0}</p>
        </div>
        <div
          onClick={() => setFollowModal({ type: "following" })}
          className="rounded-2xl bg-slate-950/80 p-4 text-center border border-slate-800 shadow-sm cursor-pointer hover:border-primary/50 transition"
        >
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Connected</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{profile.followingCount ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4 text-center border border-slate-800 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Pulses</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{posts.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4 text-center border border-slate-800 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-secondary font-semibold">Re-Pulses</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{repulses.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4 text-center border border-slate-800 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-pink-400 font-semibold">Signals</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{totalSignalsReceived}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4 text-center border border-slate-800 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Projects</p>
          <p className="mt-1.5 text-2xl font-bold text-white">{projects.length}</p>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex gap-4 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("posts")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "posts"
              ? "bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-sm">sensors</span>
          <span>Pulses ({posts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("repulses")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "repulses"
              ? "bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-sm">repeat</span>
          <span>Re-Pulses ({repulses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "projects"
              ? "bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-sm">layers</span>
          <span>Projects ({projects.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("github")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "github"
              ? "bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-sm">terminal</span>
          <span>GitHub Showcase</span>
        </button>
        <button
          onClick={() => setActiveTab("about")}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "about"
              ? "bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="material-symbols-outlined text-sm">badge</span>
          <span>Identity & Links</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {loadingPosts ? (
            <div className="text-center py-12 text-xs text-slate-500">Loading pulses...</div>
          ) : posts.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-500">
              No pulses shared yet.
            </div>
          ) : (
            posts.map((post) => {
              const targetPostId = post._id;
              const isLiked =
                optimisticLikes[targetPostId]?.isLiked ??
                (loggedInUserId &&
                  Array.isArray(post.likes) &&
                  post.likes.some((id) => String(id) === String(loggedInUserId)));

              const likeCount =
                optimisticLikes[targetPostId]?.count ??
                (post.signalCount ?? (Array.isArray(post.likes) ? post.likes.length : 0));

              const echoCount =
                post.echoCount ?? (Array.isArray(post.comments) ? post.comments.length : 0);

              const repulseCount = post.repulseCount ?? 0;
              const pulseScore = post.pulseScore ?? 0;
              const hasRepulsed = Boolean(post.hasRepulsed);
              const isCommentsOpen = Boolean(expandedComments[targetPostId]);
              const isCurrentlyEditing = editingPost?._id === post._id;

              const isPostAuthor = Boolean(
                loggedInUserId &&
                ((post.author?._id && String(post.author._id) === String(loggedInUserId)) ||
                  (post.author && String(post.author) === String(loggedInUserId)) ||
                  isOwnProfile)
              );

              const authorAvatar =
                post.author?.avatar ||
                profile?.avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
              const authorName = post.author?.fullname || profile?.fullname || "Developer";
              const authorHandle = post.author?.username || profile?.username || username;

              return (
                <article
                  key={post._id}
                  className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-primary/40 transition-all duration-300 space-y-4 shadow-sm relative"
                >
                  {/* Top Bar: Author, Date, Resonance, Pinned, Three-dot Menu */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/profile/${authorHandle}`}
                        className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-800 flex-shrink-0 hover:border-primary/50 transition"
                      >
                        <img
                          src={authorAvatar}
                          alt={authorName}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/profile/${authorHandle}`}
                            className="text-sm font-bold text-white hover:text-primary transition"
                          >
                            {authorName}
                          </Link>
                          <span className="text-xs text-slate-400 font-mono">
                            @{authorHandle}
                          </span>
                          {post.isPinned && (
                            <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">push_pin</span>
                              Pinned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                          {pulseScore > 0 && (
                            <div
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20 text-[10px] font-mono text-amber-300 select-none"
                              title={`Resonance Score: ${pulseScore} pts`}
                            >
                              <span className="material-symbols-outlined text-xs text-amber-400">bolt</span>
                              <span>{pulseScore} Resonance</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Three-Dot Menu (for owner of post) */}
                    {isPostAuthor && (
                      <div className="relative pulse-menu-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuPostId(openMenuPostId === post._id ? null : post._id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                          title="More options"
                        >
                          <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>

                        {openMenuPostId === post._id && (
                          <div className="absolute right-0 top-8 z-30 w-40 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-md">
                            <button
                              onClick={() => handleStartEdit(post)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-primary/20 hover:text-primary rounded-lg transition text-left"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              <span>Edit Pulse</span>
                            </button>
                            <button
                              onClick={() => handleTogglePin(post._id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition text-left"
                            >
                              <span className="material-symbols-outlined text-sm">push_pin</span>
                              <span>{post.isPinned ? "Unpin Pulse" : "Pin Pulse"}</span>
                            </button>
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition text-left"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              <span>Delete Pulse</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline Editor if active */}
                  {isCurrentlyEditing ? (
                    <div className="bg-slate-900/90 border border-primary/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-primary font-mono font-bold">
                        <span>Edit Pulse Content</span>
                        <span className="text-slate-500 font-normal">markdown supported</span>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-primary transition resize-none font-mono"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingPost(null)}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit}
                          className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(106,91,205,0.4)] disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xs">save</span>
                          <span>{isSavingEdit ? "Saving..." : "Save Changes"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.content && (
                        <PulseContent content={post.content} />
                      )}
                      {post.image && (
                        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 max-h-[450px]">
                          <img
                            src={post.image}
                            alt="Pulse media"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Action Bar: Signal Boost, Discussion Echoes, Re-Pulse */}
                  <div className="flex items-center gap-6 pt-3 border-t border-slate-800/60 select-none">
                    <button
                      onClick={() => handleLike(targetPostId, likeCount, isLiked)}
                      className={`flex items-center gap-1.5 transition-all text-xs font-bold ${
                        isLiked ? "text-pink-500" : "text-slate-400 hover:text-pink-400"
                      }`}
                      title="Signal Boost"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isLiked ? "favorite" : "favorite_border"}
                      </span>
                      <span>
                        {likeCount} {likeCount === 1 ? "Signal" : "Signals"}
                      </span>
                    </button>

                    <button
                      onClick={() => toggleComments(targetPostId)}
                      className={`flex items-center gap-1.5 transition-all text-xs font-bold ${
                        isCommentsOpen ? "text-primary" : "text-slate-400 hover:text-primary"
                      }`}
                      title="Discussion Echoes"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                      <span>
                        {echoCount} {echoCount === 1 ? "Echo" : "Echoes"}
                      </span>
                    </button>

                    <button
                      onClick={() => handleRepost(targetPostId)}
                      className={`flex items-center gap-1.5 transition-all text-xs font-bold ${
                        hasRepulsed ? "text-secondary" : "text-slate-400 hover:text-secondary"
                      }`}
                      title="Re-Pulse"
                    >
                      <span className="material-symbols-outlined text-[18px]">repeat</span>
                      <span>
                        Re-Pulse{repulseCount > 0 ? ` (${repulseCount})` : ""}
                      </span>
                    </button>
                  </div>

                  {/* Inline Comments */}
                  {isCommentsOpen && (
                    <InlineComments parentId={targetPostId} parentType="Post" />
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {activeTab === "repulses" && (
        <div className="space-y-4">
          {loadingRepulses ? (
            <div className="text-center py-12 text-xs text-slate-500">
              <span className="material-symbols-outlined animate-spin mr-2 align-middle">sync</span>
              Loading re-pulses...
            </div>
          ) : repulses.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-500">
              No re-pulses shared by @{profile.username || username} yet.
            </div>
          ) : (
            repulses.map((item) => {
              const orig = item.repostedFrom || {};
              const origAuthor = orig.author || {};
              const targetPostId = orig._id;

              const isLiked =
                targetPostId &&
                (optimisticLikes[targetPostId]?.isLiked ??
                  (loggedInUserId &&
                    Array.isArray(orig.likes) &&
                    orig.likes.some((id) => String(id) === String(loggedInUserId))));

              const likeCount =
                targetPostId &&
                (optimisticLikes[targetPostId]?.count ??
                  (item.signalCount ?? (Array.isArray(orig.likes) ? orig.likes.length : 0)));

              const echoCount =
                targetPostId &&
                (item.echoCount ?? (Array.isArray(orig.comments) ? orig.comments.length : 0));

              const repulseCount = item.repulseCount ?? 0;
              const hasRepulsed = Boolean(item.hasRepulsed);
              const isCommentsOpen = targetPostId && Boolean(expandedComments[targetPostId]);

              const isOwnRepulse =
                loggedInUserId &&
                item.author?._id &&
                String(item.author._id) === String(loggedInUserId);

              return (
                <article
                  key={item._id}
                  className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4 relative hover:border-primary/40 transition"
                >
                  <div className="flex items-center justify-between text-xs text-secondary font-medium pb-2 border-b border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">repeat</span>
                      <span>@{profile.username || username} re-pulsed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {isOwnRepulse && targetPostId && (
                        <button
                          onClick={() => handleRepost(targetPostId)}
                          className="text-[11px] text-red-400 hover:underline flex items-center gap-0.5 ml-2 cursor-pointer"
                          title="Un-Pulse"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                          <span>Un-Pulse</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {orig._id ? (
                    <div className="space-y-3 pt-1">
                      <Link
                        to={`/profile/${origAuthor.username}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <img
                          src={origAuthor.avatar || "https://via.placeholder.com/40"}
                          alt={origAuthor.username}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-700 group-hover:border-primary transition"
                        />
                        <div>
                          <div className="font-bold text-white text-xs group-hover:text-primary transition">
                            {origAuthor.fullname || origAuthor.username}
                          </div>
                          <div className="text-[11px] text-slate-400">@{origAuthor.username}</div>
                        </div>
                      </Link>
                      {orig.content && (
                        <PulseContent content={orig.content} />
                      )}
                      {orig.image && (
                        <img
                          src={orig.image}
                          alt="Pulse media"
                          className="rounded-xl max-h-80 w-full object-cover border border-slate-800"
                        />
                      )}

                      {/* Action Bar on Re-Pulse */}
                      <div className="flex items-center gap-6 pt-3 border-t border-slate-800/60 select-none">
                        <button
                          onClick={() => handleLike(targetPostId, likeCount, isLiked)}
                          className={`flex items-center gap-1.5 transition-all text-xs font-bold ${
                            isLiked ? "text-pink-500" : "text-slate-400 hover:text-pink-400"
                          }`}
                          title="Signal Boost"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isLiked ? "favorite" : "favorite_border"}
                          </span>
                          <span>
                            {likeCount} {likeCount === 1 ? "Signal" : "Signals"}
                          </span>
                        </button>

                        <button
                          onClick={() => toggleComments(targetPostId)}
                          className={`flex items-center gap-1.5 transition-all text-xs font-bold ${
                            isCommentsOpen ? "text-primary" : "text-slate-400 hover:text-primary"
                          }`}
                          title="Discussion Echoes"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                          <span>
                            {echoCount} {echoCount === 1 ? "Echo" : "Echoes"}
                          </span>
                        </button>

                        <button
                          onClick={() => handleRepost(targetPostId)}
                          className="flex items-center gap-1.5 transition-all text-xs font-bold text-secondary hover:text-secondary/80"
                          title="Re-Pulse"
                        >
                          <span className="material-symbols-outlined text-[18px]">repeat</span>
                          <span>
                            Re-Pulse{repulseCount > 0 ? ` (${repulseCount})` : ""}
                          </span>
                        </button>
                      </div>

                      {isCommentsOpen && (
                        <InlineComments parentId={targetPostId} parentType="Post" />
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">Original pulse is no longer available.</div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {activeTab === "projects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loadingProjects ? (
            <div className="col-span-full text-center py-12 text-xs text-slate-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-8 text-center text-xs text-slate-500">
              No showcase projects published yet.
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj._id}
                className="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col"
              >
                <img
                  src={proj.thumbnail || "https://via.placeholder.com/400x200"}
                  alt={proj.title}
                  className="h-40 w-full object-cover"
                />
                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{proj.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{proj.description}</p>
                    {proj.techStack && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {(Array.isArray(proj.techStack)
                          ? proj.techStack
                          : String(proj.techStack).split(',')
                        )
                          .map((t) => String(t).trim().replace(/^['"\[\]]+|['"\[\]]+$/g, ''))
                          .filter(Boolean)
                          .map((tech, idx) => (
                            <span
                              key={idx}
                              className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono px-1.5 py-0.5 rounded"
                            >
                              {tech}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-800 text-xs">
                    {proj.githubLink && (
                      <a
                        href={proj.githubLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white"
                      >
                        Source Code
                      </a>
                    )}
                    {proj.liveLink && (
                      <a
                        href={proj.liveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Live Preview
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "about" && (
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="glass-card rounded-3xl p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">About</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {profile.bio || "No detailed bio provided yet."}
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Skills & Stack</h2>
              <div className="flex flex-wrap gap-2">
                {skills.length > 0 ? (
                  skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs text-primary font-mono"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-xs">No skills listed yet.</span>
                )}
              </div>
            </div>
          </div>

          <aside className="glass-card rounded-3xl p-8 space-y-6">
            <h2 className="text-lg font-semibold text-white">External Profiles</h2>
            <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 space-y-3 text-xs">
              {profile.github && (
                <a
                  href={`https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-slate-300 hover:text-primary transition"
                >
                  <span>GitHub</span>
                  <span className="text-slate-500">/{profile.github}</span>
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-slate-300 hover:text-primary transition"
                >
                  <span>LinkedIn</span>
                  <span className="text-slate-500">Profile</span>
                </a>
              )}
              {profile.portfolio && (
                <a
                  href={profile.portfolio}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-slate-300 hover:text-primary transition"
                >
                  <span>Portfolio</span>
                  <span className="text-slate-500">Visit</span>
                </a>
              )}
              {!profile.github && !profile.linkedin && !profile.portfolio && (
                <p className="text-slate-500">No external links configured.</p>
              )}
            </div>
          </aside>
        </section>
      )}

      {activeTab === "github" && (
        <GitHubShowcase
          githubUsername={profile.github}
          isOwnProfile={isOwnProfile}
          onGithubUpdated={(newGithub) => {
            dispatch(
              setCredentials({
                user: { ...(userInfo?.user || userInfo), github: newGithub },
                accessToken: userInfo?.accessToken,
                refreshToken: userInfo?.refreshToken,
              })
            );
            refetch();
          }}
        />
      )}

      {/* Modals */}
      {isOwnProfile && isEditing && (
        <EditProfileModal
          user={profile}
          onClose={() => setIsEditing(false)}
          onSave={handleEditSave}
        />
      )}

      {followModal && (
        <FollowListModal
          userId={currentProfileId}
          type={followModal.type}
          onClose={() => setFollowModal(null)}
        />
      )}
    </div>
  );
};

export default Profile;
