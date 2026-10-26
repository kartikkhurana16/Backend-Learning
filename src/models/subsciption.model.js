import mongoose, { Schema } from "mongoose";
const subcriptionSchema= new mongoose.Schema({
    subscriber:{
        type: Schema.Types.ObjectId,
        ref:"User"
    },
    channels:{
        type: Schema.Types.ObjectId,
        ref:"User"
    },

},{timestamps:true})

export const Subscription = mongoose.model("Subscription",subcriptionSchema)