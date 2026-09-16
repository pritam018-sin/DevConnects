import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUpdateAccountDetailsMutation } from "../../redux/api/userApiSlice.js";

const GitHubShowcase = ({ githubUsername, isOwnProfile, onGithubUpdated }) => {
  const [githubData, setGithubData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [inputGithub, setInputGithub] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [updateAccount] = useUpdateAccountDetailsMutation();

  const fetchGithubInfo = async (username) => {
    if (!username) return;
    setIsLoading(true);
    setError(null);
    try {
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      if (!userRes.ok) {
        throw new Error("GitHub profile not found");
      }
      const userData = await userRes.json();
      setGithubData(userData);

      const reposRes = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=6`
      );
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setRepos(Array.isArray(reposData) ? reposData : []);
      }
    } catch (err) {
      console.warn("GitHub fetch error:", err);
      setError(err.message || "Failed to load GitHub data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (githubUsername) {
      fetchGithubInfo(githubUsername);
    }
  }, [githubUsername]);

  const handleConnectGithub = async (e) => {
    e.preventDefault();
    if (!inputGithub.trim()) return;

    setIsConnecting(true);
    const cleanUsername = inputGithub.trim().replace(/^@/, "");

    try {
      // Validate with GitHub API first
      const verifyRes = await fetch(`https://api.github.com/users/${cleanUsername}`);
      if (!verifyRes.ok) {
        throw new Error("GitHub account does not exist");
      }

      // Save to DevConnect user account
      const res = await updateAccount({ github: cleanUsername }).unwrap();
      toast.success(`GitHub connected: @${cleanUsername}`);
      if (onGithubUpdated) {
        onGithubUpdated(cleanUsername);
      }
      fetchGithubInfo(cleanUsername);
    } catch (err) {
      toast.error(err.message || "Failed to link GitHub profile");
    } finally {
      setIsConnecting(false);
    }
  };

  const getLanguageColor = (lang) => {
    const colors = {
      JavaScript: "bg-yellow-400/20 text-yellow-300 border-yellow-500/30",
      TypeScript: "bg-blue-400/20 text-blue-300 border-blue-500/30",
      Python: "bg-emerald-400/20 text-emerald-300 border-emerald-500/30",
      Rust: "bg-orange-400/20 text-orange-300 border-orange-500/30",
      HTML: "bg-red-400/20 text-red-300 border-red-500/30",
      CSS: "bg-indigo-400/20 text-indigo-300 border-indigo-500/30",
      Go: "bg-cyan-400/20 text-cyan-300 border-cyan-500/30",
      C: "bg-slate-400/20 text-slate-300 border-slate-500/30",
      "C++": "bg-pink-400/20 text-pink-300 border-pink-500/30",
    };
    return colors[lang] || "bg-primary/20 text-primary border-primary/30";
  };

  return (
    <div className="space-y-6">
      {/* If No GitHub Linked */}
      {!githubUsername && !githubData && (
        <div className="glass-card rounded-3xl p-8 text-center border border-slate-800 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-white">
            <span className="material-symbols-outlined text-2xl">terminal</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connect GitHub Profile</h3>
            <p className="text-xs text-slate-400 mt-1">
              Link your GitHub handle to display public repositories, commit stats, and showcase open source contributions.
            </p>
          </div>

          {isOwnProfile ? (
            <form onSubmit={handleConnectGithub} className="flex gap-2 pt-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">@</span>
                <input
                  type="text"
                  value={inputGithub}
                  onChange={(e) => setInputGithub(e.target.value)}
                  placeholder="github-username"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-xs text-slate-200 outline-none focus:border-primary transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isConnecting}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-[0_0_15px_rgba(106,91,205,0.4)]"
              >
                {isConnecting ? "Connecting..." : "Link"}
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-500 italic">This creator has not connected their GitHub yet.</p>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-slate-500 text-xs">
          Fetching live GitHub telemetry...
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="glass-card rounded-2xl p-6 text-center border border-slate-800 text-slate-400 text-xs">
          <p>{error}</p>
        </div>
      )}

      {/* GitHub Profile Overview Card */}
      {githubData && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={githubData.avatar_url}
                alt={githubData.login}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {githubData.name || githubData.login}
                  </h3>
                  <a
                    href={githubData.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-400 hover:text-primary transition font-mono"
                  >
                    @{githubData.login}
                  </a>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                  {githubData.bio || "No GitHub bio provided."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-center">
              <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                  Public Repos
                </span>
                <span className="font-mono text-base font-bold text-white">
                  {githubData.public_repos}
                </span>
              </div>
              <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                  Followers
                </span>
                <span className="font-mono text-base font-bold text-white">
                  {githubData.followers}
                </span>
              </div>
              <a
                href={githubData.html_url}
                target="_blank"
                rel="noreferrer"
                className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-[0_0_15px_rgba(106,91,205,0.4)] flex items-center gap-1.5"
              >
                <span>View on GitHub</span>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            </div>
          </div>

          {/* Repositories Grid */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">code_blocks</span>
              <span>Recent Public Repositories</span>
            </h3>

            {repos.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-500">
                No public repositories found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repos.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-primary/50 transition flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white group-hover:text-primary transition truncate font-mono">
                          {repo.name}
                        </span>
                        <span className="material-symbols-outlined text-slate-500 text-sm group-hover:text-primary transition">
                          north_east
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {repo.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      {repo.language ? (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${getLanguageColor(
                            repo.language
                          )}`}
                        >
                          {repo.language}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Code</span>
                      )}

                      <div className="flex items-center gap-3 text-slate-400 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">star</span>
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">fork_right</span>
                          {repo.forks_count}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubShowcase;
