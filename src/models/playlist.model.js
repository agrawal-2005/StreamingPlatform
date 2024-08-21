import mongoose, { Schema, Types } from "mongoose";

const playlistShema = new Schema(
    {
        name:{
            type: String,
            required: true
        },
        discription:{
            type: String,
            required: true
        },
        videos:[
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        owner:{
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

export const Playlist = mongoose.model("Playlist", playlistShema)