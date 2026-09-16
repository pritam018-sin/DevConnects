import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Project } from "../models/project.Model.js";
import { User } from "../models/user.Model.js";
import mongoose from "mongoose";
import { Comment } from "../models/comment.Model.js";
import { cloudinaryUpload } from "../utils/cloudnaryService.js";

const createProject = asyncHandler(async (req, res) => {
  let { title, description, techStack, githubLink, liveLink } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }
  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }
  const thumbnailCloud = await cloudinaryUpload(thumbnailLocalPath);

  if (!thumbnailCloud) {
    throw new ApiError(500, "Thumbnail upload failed");
  }

  let parsedTechStack = [];
  if (Array.isArray(techStack)) {
    parsedTechStack = techStack;
  } else if (typeof techStack === "string") {
    try {
      const json = JSON.parse(techStack);
      parsedTechStack = Array.isArray(json) ? json : [techStack];
    } catch {
      parsedTechStack = techStack.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const project = await Project.create({
    author: req.user._id,
    title,
    description,
    techStack: parsedTechStack,
    githubLink,
    liveLink,
    thumbnail: thumbnailCloud.url || "",
  });
  if (!project) {
    throw new ApiError(500, "Project creation failed");
  }
  res
    .status(201)
    .json(new ApiResponse(201, project, "Project created successfully"));
});

const getAllProjects = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, techStack, search } = req.query;

  // Convert to integers
  page = parseInt(page);
  limit = parseInt(limit);

  const filter = {};

  if (techStack?.trim()) {
    filter.techStack = { $regex: techStack.trim(), $options: "i" };
  }

  if (search?.trim()) {
    const sRegex = { $regex: search.trim(), $options: "i" };
    filter.$or = [
      { title: sRegex },
      { description: sRegex },
      { techStack: sRegex },
    ];
  }

  const projects = await Project.find(filter)
    .populate("author", "fullname username avatar") // ✅ correct field name is author
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Project.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, { projects, total }, "Projects fetched successfully")
  );
});

const getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid project ID");
    }

    const project = await Project.findById(projectId)
        .populate("author", "fullname username avatar")
        .populate("comments")
        .exec();

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    res.status(200).json(new ApiResponse(200, project, "Project fetched successfully"));
});

const getProjectByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const projects = await Project.find({ author: user._id })
    .populate("author", "fullname username avatar")
    .populate("comments")
    .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, projects, "Projects fetched successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const authorId = project.author?._id || project.author;
  if (String(authorId) !== String(req.user._id)) {
    throw new ApiError(403, "You are not authorized to update this project");
  }

  const updateFields = req.body;

  Object.keys(updateFields).forEach((key) => {
    project[key] = updateFields[key] ?? project[key];
  });

  await project.save();

  res
    .status(200)
    .json(new ApiResponse(200, project, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const authorId = project.author?._id || project.author;
  if (String(authorId) !== String(req.user._id)) {
    throw new ApiError(403, "You are not authorized to delete this project");
  }

  await project.deleteOne();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Project deleted successfully"));
});

//analitics part can be added later

export {
    createProject,
    getAllProjects,
    getProjectById,
    getProjectByUsername,
    updateProject,
    deleteProject
};
