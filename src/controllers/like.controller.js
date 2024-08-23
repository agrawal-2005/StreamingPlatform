import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is invalid");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid user Id");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isLiked = await Like.findOne({ video: videoId, likedBy: user?._id });

  let videolikeStatus;
  try {
    if (!isLiked) {
      await Like.create({
        video: videoId,
        likedBy: user?._id,
      });
      videolikeStatus = { isLiked: true };
    } else {
      await Like.deleteOne(isLiked._id);
      videolikeStatus = { isLiked: false };
    }
  } catch (error) {
    throw new ApiError(400, "Error while toggle like", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, videolikeStatus, "Video Like Toggle sucessfully")
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment Id");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid user Id");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isLiked = await Like.findOne({
    comment: commentId,
    LikedBy: user?._id,
  });

  let commentlikeStatus;
  try {
    if (!isLiked) {
      await Like.create({
        comment: commentId,
        likedBy: user?._id,
      });

      commentlikeStatus = { isLiked: true };
    } else {
      await Like.deleteOne(isLiked._id);
      commentlikeStatus = { isLiked: false };
    }
  } catch (error) {
    throw new ApiError(400, "Error while toggle comment like", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, commentlikeStatus, "Comment Like Toggle sucessfully")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet Id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid user Id");
  }

  const user = await User.findById(req.user?._id);
  const isLiked = await Like.findOne({ tweet: tweetId, LikedBy: user?._id });

  let likeStatus;
  try {
    if (!isLiked) {
      await Like.create({
        tweet: tweet,
        LikedBy: user?._id,
      });
      likeStatus = { isLiked: true };
    } else {
      await Like.deleteOne(isLiked._id);
      likeStatus = { isLiked: false };
    }
  } catch (error) {
    throw new ApiError(400, "Error while toggle comment", error);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, likeStatus, "Comment Like Toggle sucessfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              video: 1,
              thumbnail: 1,
              title: 1,
              description: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "All liked Videos fetched sucessfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };