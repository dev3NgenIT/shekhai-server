exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const folder = req.body.folder || "users";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  const fileUrl = `${protocol}://${host}/uploads/${folder}/${req.file.filename}`;

  res.json({
    success: true,
    message: "File uploaded successfully",
    fileUrl,
    filename: req.file.filename,
  });
};
