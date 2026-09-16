import React, { useState } from "react";
import { useUpdateAccountDetailsMutation } from "../../redux/api/userApiSlice";

const EditProfileModal = ({ user, onClose, onSave }) => {
  const [updateAccountDetails, { isLoading }] = useUpdateAccountDetailsMutation();

  const [fullname, setFullname] = useState(user?.fullname || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [skills, setSkills] = useState(user?.skills?.join(", ") || "");
  const [portfolio, setPortfolio] = useState(user?.portfolio || "");
  const [github, setGithub] = useState(user?.github || "");
  const [linkedin, setLinkedin] = useState(user?.linkedin || "");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const updatedInfo = {
      fullname: fullname.trim(),
      username: username.trim(),
      email: user?.email, // Keep email same since not in form
      linkedin: linkedin.trim(),
      bio: bio.trim(),
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      portfolio: portfolio.trim(),
      github: github.trim(),
    };

    try {
      // 1. Call the API mutation
      const response = await updateAccountDetails(updatedInfo).unwrap();
      
      // 2. Pass the successful response data back to the parent component
      // The parent is responsible for dispatching to Redux, showing the Toast, and navigating.
      if (onSave) {
        await onSave(response.data || response);
      }
      
      // 3. Close the modal on success
      onClose();
    } catch (err) {
      console.error("Profile update error", err);
      // Optional: If you have a toast library imported in this file, you can show the error here.
      // toast.error("Unable to save profile: " + (err?.data?.message || "Please try again"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background-dark/95 border border-primary/20 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(106,91,205,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
            <h2 className="text-2xl font-bold text-slate-100">Edit Identity</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl bg-background-light/50 border border-slate-700 focus:border-primary text-slate-100 p-3 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full rounded-xl bg-background-light/50 border border-slate-700 focus:border-primary text-slate-100 p-3 pl-8 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full rounded-xl bg-background-light/50 border border-slate-700 focus:border-primary text-slate-100 p-3 outline-none transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Skills (comma separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, Node.js, 3D Graphics"
                className="w-full rounded-xl bg-background-light/50 border border-slate-700 focus:border-primary text-slate-100 p-3 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Portfolio URL
              </label>
              <input
                type="url"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full rounded-xl bg-background-light/50 border border-slate-700 focus:border-primary text-slate-100 p-3 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                GitHub Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                  @
                </span>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-xl bg-background-light/50 border border-slate-700 focus:border-primary text-slate-100 p-3 pl-8 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full rounded-xl bg-background-light/50 border border-slate-700 focus:border-primary text-slate-100 p-3 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 flex justify-end gap-3 shrink-0 bg-background-dark">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-primary hover:bg-primary/80 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(106,91,205,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;