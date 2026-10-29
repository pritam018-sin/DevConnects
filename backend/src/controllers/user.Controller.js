import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.Model.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { cloudinaryUpload } from "../utils/cloudnaryService.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const createUser = asyncHandler(async (req, res) => {
  const {
    fullname,
    username,
    email,
    password,
    bio,
    skills,
    github,
    linkedin,
    portfolio,
  } = req.body;

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  console.log("Creating user with email:", email, "and username:", username);
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email or username");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await cloudinaryUpload(avatarLocalPath);
  const coverImage = await cloudinaryUpload(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.create({
    fullname,
    username,
    email,
    password,
    bio,
    skills,
    github,
    linkedin,
    portfolio,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }

  res
    .status(201)
    .json(new ApiResponse(201, "User created successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  console.log("Login Attempt:", { email, username, password }); // Debug Log

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }
  //find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    console.log("Login Failed: User not found"); // Debug Log
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  console.log("Password Validation:", isPasswordValid); // Debug Log

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  //Access and refresh token
  const { accessToken, refreshToken } = await generateAccessTokenRefreshToken(
    user._id
  );

  //send cookie
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        "User logged In Successfully",
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        }
        // "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthrized request, no refresh token");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(404, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh Token expired or used");
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };
    const { accessToken, newRefreshToken } =
      await generateAccessTokenRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            newRefreshToken,
          },
          "Access Token Refreshed Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Validate request body
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {
    fullname,
    username,
    email,
    bio,
    skills,
    github,
    linkedin,
    portfolio,
  } = req.body;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Ab sirf wahi fields update karo jo nayi mili hain
  user.fullname = fullname?.trim() || user.fullname;
  user.username = username?.trim() || user.username;
  user.email = email?.trim() || user.email;
  user.bio = bio ?? user.bio;
  user.skills = skills ?? user.skills;
  user.github = github ?? user.github;
  user.linkedin = linkedin ?? user.linkedin;
  user.portfolio = portfolio ?? user.portfolio;

  // Save updated user
  await user.save();

  const updatedUser = await User.findById(req.user?._id).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await cloudinaryUpload(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(500, "Avatar upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar?.url,
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is required");
  }
  const coverImage = await cloudinaryUpload(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(500, "Cover image upload failed");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage?.url,
      },
    },
    {
      new: true,
    }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserProfileById = asyncHandler(async (req, res) => {
  const targetId = req.params.userId || req.user?._id;
  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    throw new ApiError(400, "Valid user ID is required");
  }
  const userId = new mongoose.Types.ObjectId(targetId);

  const userWithStats = await User.aggregate([
    { $match: { _id: userId } },

    // 👇 Followers Lookup
    {
      $lookup: {
        from: "follows",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$following", "$$uid"] },
            },
          },
        ],
        as: "followers",
      },
    },

    // 👇 Following Lookup
    {
      $lookup: {
        from: "follows",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$follower", "$$uid"] },
            },
          },
        ],
        as: "following",
      },
    },

    // 👇 Add followersCount and followingCount fields
    {
      $addFields: {
        followersCount: { $size: "$followers" },
        followingCount: { $size: "$following" },
      },
    },

    // 👇 Final projection
    {
      $project: {
        username: 1,
        fullname: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        bio: 1,
        skills: 1,
        github: 1,
        linkedin: 1,
        portfolio: 1,
        createdAt: 1,
        followersCount: 1,
        followingCount: 1,
      },
    },
  ]);

  if (!userWithStats || userWithStats.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "User not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userWithStats[0], "User profile fetched successfully"));
});

const getUserProfileByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) throw new ApiError(400, "Username is required");

  const userProfile = await User.aggregate([
    {
      $match: {
        username: { $regex: new RegExp(`^${username}$`, "i") },
      },
    },

    // 👇 Followers lookup
    {
      $lookup: {
        from: "follows",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$following", "$$uid"] },
            },
          },
        ],
        as: "followers",
      },
    },

    // 👇 Following lookup
    {
      $lookup: {
        from: "follows",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$follower", "$$uid"] },
            },
          },
        ],
        as: "following",
      },
    },

    // 👇 Add stats
    {
      $addFields: {
        followersCount: { $size: "$followers" },
        followingCount: { $size: "$following" },
      },
    },

    // 👇 Final projection (pure inclusion)
    {
      $project: {
        _id: 1,
        email: 1,
        createdAt: 1,
        fullname: 1,
        username: 1,
        bio: 1,
        skills: 1,
        avatar: 1,
        coverImage: 1,
        github: 1,
        linkedin: 1,
        portfolio: 1,
        followersCount: 1,
        followingCount: 1,
      },
    },
  ]);

  if (!userProfile || userProfile.length === 0) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, userProfile[0], "User profile fetched successfully")
    );
});

const getAllUsers = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { search } = req.query;

  const matchQuery = {};
  if (currentUserId) {
    matchQuery._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
  }
  if (search?.trim()) {
    matchQuery.$or = [
      { username: { $regex: search.trim(), $options: "i" } },
      { fullname: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const users = await User.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: "follows",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$following", "$$uid"] },
            },
          },
        ],
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "follows",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$follower", "$$uid"] },
            },
          },
        ],
        as: "following",
      },
    },
    {
      $addFields: {
        followersCount: { $size: "$followers" },
        followingCount: { $size: "$following" },
      },
    },
    {
      $project: {
        _id: 1,
        fullname: 1,
        username: 1,
        email: 1,
        avatar: 1,
        bio: 1,
        skills: 1,
        followersCount: 1,
        followingCount: 1,
        createdAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

export {
  createUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserProfileById,
  getUserProfileByUsername,
  getAllUsers,
};
