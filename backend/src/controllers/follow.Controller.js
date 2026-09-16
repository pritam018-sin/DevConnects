import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Follow } from "../models/follow.Model.js";
import { User } from "../models/user.Model.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";

const toggleFollow = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params; // the user to follow/unfollow
  const currentUserId = req.user._id; // the logged-in user

  if (currentUserId.equals(targetUserId)) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  // Check if already following
  const existingFollow = await Follow.findOne({
    follower: currentUserId,
    following: targetUserId,
  });

  if (existingFollow) {
    // Unfollow
    await existingFollow.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "User unfollowed successfully"));
  } else {
    // Follow
    const follow = await Follow.create({
      follower: currentUserId,
      following: targetUserId,
    });

    // Dispatch System Notification
    sendSystemNotification({
      receiver: targetUserId,
      sender: currentUserId,
      type: "follow",
      message: `@${req.user.username} established a Synaptic Connection with you 🔗`,
      link: `/profile/${req.user.username}`,
    }).catch((err) => console.error("Notification error:", err.message));

    return res
      .status(200)
      .json(new ApiResponse(200, follow, "User followed successfully"));
  }
});

const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const followers = await Follow.find({ following: userId})
    .populate("follower", "username email avatar");

    if(!followers){
        throw new ApiError(404, "No followers found for this user");
    }

    res
    .status(200)
    .json(new ApiResponse(200, followers, "Followers fetched successfully"));
})

const getFollowing = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const following = await Follow.find({ follower: userId})
    .populate("following", "username email avatar");

    if(!following){
        throw new ApiError(404, "No following found for this user");
    }
    res
    .status(200)
    .json(new ApiResponse(200, following, "Following fetched successfully"));
})

const removeFollower = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId.equals(userId)) {
        throw new ApiError(400, "You cannot remove yourself as a follower");
    }

    const follow = await Follow.findOneAndDelete({
        follower: currentUserId,
        following: userId,
    });

    if (!follow) {
        throw new ApiError(404, "No follow relationship found");
    }

    res
        .status(200)
        .json(new ApiResponse(200, null, "Follower removed successfully"));
})
export{
    toggleFollow,
    getFollowers,
    getFollowing,
    removeFollower,
}