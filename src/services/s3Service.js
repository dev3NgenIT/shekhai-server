/**
 * S3 service stub - returns a simulated signed URL.
 * Replace implementation with AWS SDK @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner in production.
 */
async function getSignedUploadUrl({ filename, contentType }){
  // In production generate presigned PUT URL and public URL
  const publicUrl = `https://cdn.example.com/uploads/${encodeURIComponent(filename)}`;
  const uploadUrl = `https://simulated-upload.example.com/${encodeURIComponent(filename)}`;
  return { uploadUrl, publicUrl };
}

module.exports = { getSignedUploadUrl };
