import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  useGetAllProjectsQuery,
  useDeleteProjectMutation,
} from '../redux/api/projectApiSlice.js';
import { useToggleLikeMutation } from '../redux/api/likeApiSlice.js';
import CreateProjectModal from '../components/projects/CreateProjectModal.jsx';
import InlineComments from '../components/comments/InlineComments.jsx';

const getTechList = (techStack) => {
  if (!techStack) return [];
  if (Array.isArray(techStack)) {
    return techStack
      .flatMap((item) => {
        if (typeof item === 'string' && item.startsWith('[') && item.endsWith(']')) {
          try {
            const parsed = JSON.parse(item.replace(/'/g, '"'));
            if (Array.isArray(parsed)) return parsed;
          } catch {}
        }
        return String(item).split(',');
      })
      .map((s) => String(s).trim().replace(/^['"\[\]]+|['"\[\]]+$/g, ''))
      .filter(Boolean);
  }
  if (typeof techStack === 'string') {
    if (techStack.trim().startsWith('[') && techStack.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(techStack.replace(/'/g, '"'));
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      } catch {}
    }
    return techStack.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const Projects = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTech = searchParams.get('techStack') || '';
  const searchParam = searchParams.get('search') || '';

  const [selectedTech, setSelectedTech] = useState(activeTech);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeCommentProjectId, setActiveCommentProjectId] = useState(null);

  const { userInfo } = useSelector((state) => state.auth);
  const currentUserId = userInfo?._id || userInfo?.user?._id;

  const { data, isLoading } = useGetAllProjectsQuery({
    techStack: selectedTech,
    search: searchQuery,
    limit: 18,
  });

  const [deleteProject] = useDeleteProjectMutation();
  const [toggleLike] = useToggleLikeMutation();

  const rawProj = data?.data?.projects ?? data?.data ?? data?.message?.projects ?? data?.message;
  const projects = Array.isArray(rawProj) ? rawProj : [];

  const handleTechClick = (tech) => {
    const nextTech = tech === selectedTech ? '' : tech;
    setSelectedTech(nextTech);
    const newParams = new URLSearchParams(searchParams);
    if (nextTech) {
      newParams.set('techStack', nextTech);
    } else {
      newParams.delete('techStack');
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      newParams.set('search', searchQuery.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleLike = async (projectId) => {
    if (!userInfo) {
      toast.error('Please sign in to like projects');
      return;
    }
    try {
      await toggleLike({ parentId: projectId, parentType: 'Project' }).unwrap();
    } catch (err) {
      toast.error('Could not update like');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to remove this project?')) return;
    try {
      await deleteProject(projectId).unwrap();
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete project');
    }
  };

  const techFilters = [
    'React',
    'TypeScript',
    'Node.js',
    'Python',
    'Rust',
    'Next.js',
    'Web3',
    'AI',
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-8 border border-primary/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest font-bold">
            <span className="material-symbols-outlined text-sm">layers</span>
            <span>Project Index</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Discover What Engineers Are Building
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Explore open-source tools, side projects, and developer frameworks built by the DevConnect community.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="bg-slate-900 border border-slate-700 rounded-full py-2.5 pl-9 pr-4 text-xs text-slate-200 outline-none focus:border-primary transition w-full sm:w-56"
            />
          </form>

          <button
            onClick={() => {
              if (!userInfo) {
                toast.error('Please sign in to showcase projects');
                return;
              }
              setIsCreateOpen(true);
            }}
            className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-[0_0_25px_rgba(106,91,205,0.4)] transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Showcase Project</span>
          </button>
        </div>
      </div>

      {/* Tech Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
        <button
          onClick={() => handleTechClick('')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            !selectedTech
              ? 'bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}
        >
          All Tech
        </button>
        {techFilters.map((tech) => (
          <button
            key={tech}
            onClick={() => handleTechClick(tech)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedTech.toLowerCase() === tech.toLowerCase()
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(106,91,205,0.4)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {tech}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          Loading community projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-slate-600">code_blocks</span>
          <h3 className="text-base font-bold text-slate-300">No projects found in this stack</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Be the pioneer! Publish the first project built with {selectedTech || 'this tech'}.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-2 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold text-xs px-5 py-2.5 rounded-full transition"
          >
            Launch Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const author = project.author || {};
            const isOwner =
              currentUserId &&
              author._id &&
              String(author._id) === String(currentUserId);
            const isLiked =
              currentUserId &&
              project.likes?.includes(currentUserId);

            return (
              <div
                key={project._id}
                className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-primary/50 transition-all duration-300 flex flex-col group"
              >
                {/* Thumbnail */}
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  <img
                    src={project.thumbnail || 'https://via.placeholder.com/400x225'}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-transparent to-transparent" />

                  {isOwner && (
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="absolute top-3 right-3 bg-black/70 hover:bg-red-500 text-white p-1.5 rounded-lg transition"
                      title="Delete Project"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-primary transition line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>

                    {/* Tech Badges */}
                    {getTechList(project.techStack).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {getTechList(project.techStack).map((tech, idx) => (
                          <span
                            key={idx}
                            className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono px-2 py-0.5 rounded-md"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer links & actions */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <Link
                      to={author?.username ? `/profile/${author.username}` : '#'}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <img
                        src={author?.avatar || 'https://via.placeholder.com/28'}
                        alt={author?.username || 'engineer'}
                        className="w-6 h-6 rounded-full object-cover border border-slate-700"
                      />
                      <span className="text-xs text-slate-400 font-medium truncate max-w-[90px]">
                        @{author?.username || 'engineer'}
                      </span>
                    </Link>

                    <div className="flex items-center gap-3">
                      {project.githubLink && (
                        <a
                          href={project.githubLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-white transition"
                          title="GitHub Source"
                        >
                          <span className="material-symbols-outlined text-base">code</span>
                        </a>
                      )}
                      {project.liveLink && (
                        <a
                          href={project.liveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-primary transition"
                          title="Live Demo"
                        >
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleLike(project._id)}
                        className={`flex items-center gap-1 text-xs font-bold transition ${
                          isLiked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isLiked ? 'favorite' : 'favorite_border'}
                        </span>
                        <span>{project.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() =>
                          setActiveCommentProjectId(
                            activeCommentProjectId === project._id ? null : project._id
                          )
                        }
                        className={`transition flex items-center gap-1 text-xs ${
                          activeCommentProjectId === project._id
                            ? 'text-primary'
                            : 'text-slate-400 hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">chat_bubble</span>
                        <span>{project.comments?.length || 0}</span>
                      </button>
                    </div>
                  </div>

                  {activeCommentProjectId === project._id && (
                    <InlineComments parentId={project._id} parentType="Project" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <CreateProjectModal onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
};

export default Projects;
