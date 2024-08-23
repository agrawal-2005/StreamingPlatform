import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "title",
    sortType = "ascending",
    userId,
  } = req.query;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Define pagination options
  const Options = {
    page: pageNumber,
    limit: limitNumber,
  };

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        ownerDetails: { $arrayElemAt: ["$ownerDetails", 0] },
      },
    },
    {
      $skip: (Options.page - 1) * Options.limit,
    },
    {
      $limit: Options.limit,
    },
    {
      $sort: {
        [sortBy]: sortType === "ascending" ? 1 : -1,
      },
    },
  ]);

  const totalVideos = await Video.countDocuments({ owner: userId });
  const totalPages = Math.ceil(totalVideos / Options.limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, totalPages, totalVideos },
        "All videos fetched successfully"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const videoLocalPath = req.files?.video[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const videofile = await uploadOnCloudinary(videoLocalPath);
  const thumbnailfile = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videofile) {
    throw new ApiError(400, "Error while uploading Video on cloudinary");
  }
  if (!thumbnailfile) {
    throw new ApiError(400, "Error while uploading Thumbnail on cloudinary");
  }

  const video = await Video.create({
    video: videofile.url,
    thumbnail: thumbnailfile.url,
    publicId: videofile.publicId,
    title,
    description,
    duration: videofile.duration,
    owner: req.user?._id,
  });

  const videouploaded = await Video.findById(video?._id).select(
    "-videoFile -thumbnail -views -isPublished"
  );
  if (!videouploaded) {
    throw new ApiError(400, "Error in uploading video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videoUploaded, "Video Uploaded sucessfully !"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const user = await User.findById(req.user?._id);

  if (!user.watchHistory.includes(videoId)) {
    await Video.findByIdAndUpdate(
      videoId,
      {
        $inc: {
          views: 1,
        },
      },
      {
        new: true,
      }
    );
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $addToSet: {
        watchHistory: videoId,
      },
    },
    {
      new: true,
    }
  );
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video is fetched by videoId"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, thumbnail } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invlaid videoId");
  }

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const video = await Video.findById(videoId);

  const publicId = video.publicId;

  if (!publicId) {
    throw new ApiError(400, "publicId is not present");
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    throw new ApiError(400, "error in deleting video ");
  }

  const videoLocalPath = req.file?.path;

  if (!videoLocalPath) {
    throw new ApiError(
      400,
      "video file is required please choose the file to update"
    );
  }

  const newVideo = await uploadOnCloudinary(videoLocalPath);

  if (!newVideo.url) {
    throw new ApiError(400, "Error while uploading on cloudinary");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        video: newVideo.secure_url,
        publicId: newVideo.public_id,
        duration: newVideo.duration,
      },
    },
    {
      new: true,
    }
  );
  if (!updatedVideo) {
    throw new ApiError(400, "Error updating video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video Updated Sucessfully !"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const publicId = video.publicId;
  if (!publicId) {
    throw new ApiError(400, "Invalid Public Id");
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    throw new ApiError(400, "Error in deleting video file");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, [], "Video is deleted successfully !"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const video = await Video.findById(videoId);

  if (!isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      "Invalid videoId"
    );
  }

  video.isPublished = !video.isPublished;

  const publishStatus = await Video.findByIdAndUpdate(
    videoId,
    {
      isPublished: video.isPublished,
    },
    {
      new: true,
    }
  ).select("-video -thumbnail -title -description -views -duration -owner");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        publishStatus,
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
