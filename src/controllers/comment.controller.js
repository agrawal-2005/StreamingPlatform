import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate the videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
  };

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
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
      $skip: (options.page - 1) * options.limit,
    },
    {
      $limit: options.limit,
    },
  ]);

  const totalComments = await Comment.countDocuments({ video: videoId });
  const totalPages = Math.ceil(totalComments / options.limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { comments, totalComments, page: options.page, totalPages },
        "All comments fetched successfully!"
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not Found");
  }

  if (content?.trim() === "") {
    throw new ApiError(400, "content is Required");
  }

  const comment = await Comment.create({
    content: content,
    owner: req.user?._id,
    video: videoId,
  });

  return res
    .status(200)
    .json(new ApiError(200, comment, "Comment added Sucessfully!"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { newcomment } = req.body;

  if (!newcomment?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    videoId,
    {
      $set: {
        content: newcomment,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedComment) {
    throw new ApiError(400, "Error in updating comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated succesfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video not found");
  }

  const deletedComment = await Comment.findByIdAndDelete(videoId);

  if (!deleteComment) {
    throw new ApiError(400, "Comment not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Comment deleted successfully", deletedComment));
});

export { getVideoComments, addComment, updateComment, deleteComment };
