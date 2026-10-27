import multer from "multer";

// Files are kept in memory and streamed straight to Cloudinary (see utils/uploadImage.js).
// Nothing is written to disk, which suits Vercel's read-only filesystem and leaves no temp files.
// Vercel limits a whole request body to ~4.5 MB, so keep individual images small.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 4 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/")) return callback(null, true);
        const err = new Error("Only image files can be uploaded");
        err.code = "INVALID_FILE_TYPE";
        callback(err);
    },
});

// Product image fields (image1–image4) with friendly errors instead of a crashed request
export const productImages = (req, res, next) => {
    upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }])(req, res, (err) => {
        if (!err) return next();
        const message =
            err.code === "LIMIT_FILE_SIZE" ? "Each image must be 4 MB or smaller" :
            err.code === "INVALID_FILE_TYPE" ? "Only image files can be uploaded" :
            "Couldn't read the uploaded images";
        return res.json({ success: false, message });
    });
};

export default upload;
