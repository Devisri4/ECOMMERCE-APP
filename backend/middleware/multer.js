import multer from "multer";

// Setup multer storage
const storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, "uploads"); // Always use your uploads folder ONLY!
    },
    filename: function(req, file, callback) {
        callback(null, Date.now() + "-" + file.originalname);
    }
});

// Declare upload middleware ONCE
const upload = multer({ storage });

// Correct ES Module default export
export default upload;

