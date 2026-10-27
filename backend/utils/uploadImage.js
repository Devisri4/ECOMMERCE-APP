import { v2 as cloudinary } from "cloudinary";

// Streams an in-memory multer file to Cloudinary and resolves to its secure URL.
export const uploadImageBuffer = (file) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) =>
            error ? reject(error) : resolve(result.secure_url)
        );
        stream.end(file.buffer);
    });
