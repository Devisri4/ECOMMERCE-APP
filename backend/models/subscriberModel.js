import mongoose from "mongoose";

// Newsletter sign-ups (email only). Emails are stored lowercase; the unique index prevents duplicates.
const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    date: { type: Number, required: true },
});

const subscriberModel = mongoose.models.subscriber || mongoose.model("subscriber", subscriberSchema);

export default subscriberModel;
