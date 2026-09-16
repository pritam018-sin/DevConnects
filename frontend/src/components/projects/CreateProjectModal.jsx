import React, { useState } from "react";
import toast from "react-hot-toast";
import { useCreateProjectMutation } from "../../redux/api/projectApiSlice.js";

const CreateProjectModal = ({ onClose }) => {
  const [createProject, { isLoading }] = useCreateProjectMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [liveLink, setLiveLink] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if (!thumbnail) {
      toast.error("Thumbnail image is required");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("techStack", techStack.trim());
    formData.append("githubLink", githubLink.trim());
    formData.append("liveLink", liveLink.trim());
    formData.append("thumbnail", thumbnail);

    try {
      await createProject(formData).unwrap();
      toast.success("Project launched successfully! 🚀");
      onClose();
    } catch (err) {
      console.error("Project creation error:", err);
      toast.error(err?.data?.message || "Failed to create project");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark/95 border border-primary/20 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-[0_0_60px_rgba(106,91,205,0.2)] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">rocket_launch</span>
            <h2 className="text-xl font-bold text-white">Showcase Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div>
            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DevConnect Pulse"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-primary transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does your project do? What problem does it solve?"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-primary transition resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
              Tech Stack (Comma Separated)
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="e.g. React, Node.js, WebGL, TailwindCSS"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-primary transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
                Live Demo / Website URL
              </label>
              <input
                type="url"
                value={liveLink}
                onChange={(e) => setLiveLink(e.target.value)}
                placeholder="https://myproject.app"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-slate-400 mb-1">
              Thumbnail Preview Image *
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                required
              />
              {previewUrl ? (
                <div className="relative rounded-lg overflow-hidden h-40">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs font-semibold text-white">
                    Click to change thumbnail
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-3xl text-primary">add_photo_alternate</span>
                  <span className="text-sm font-medium">Click to upload screenshot or thumbnail</span>
                  <span className="text-xs text-slate-600">PNG, JPG, WebP supported</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-bold text-sm shadow-[0_0_20px_rgba(106,91,205,0.4)] transition flex items-center gap-2"
            >
              {isLoading ? "Publishing..." : "Launch Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
