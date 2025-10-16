const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a single image to Cloudinary
 * @param {Buffer|string} file - File buffer or base64 string
 * @param {string} folder - Folder path in Cloudinary
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadImage = async (file, folder = 'implanner', options = {}) => {
  try {
    const uploadOptions = {
      folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} files - Array of file buffers or base64 strings
 * @param {string} folder - Folder path in Cloudinary
 * @param {Object} options - Additional upload options
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleImages = async (files, folder = 'implanner/clinics', options = {}) => {
  try {
    const uploadPromises = files.map((file, index) => 
      uploadImage(file, folder, { 
        ...options, 
        public_id: `${Date.now()}_${index}` 
      })
    );

    const results = await Promise.all(uploadPromises);
    
    return {
      success: true,
      results: results.filter(result => result.success),
      errors: results.filter(result => !result.success)
    };
  } catch (error) {
    console.error('Multiple image upload error:', error);
    return {
      success: false,
      error: error.message,
      results: [],
      errors: []
    };
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array} publicIds - Array of public IDs to delete
 * @returns {Promise<Object>} Deletion results
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    
    return {
      success: true,
      deleted: result.deleted,
      notFound: result.not_found
    };
  } catch (error) {
    console.error('Multiple image delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get image details from Cloudinary
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<Object>} Image details
 */
const getImageDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      details: result
    };
  } catch (error) {
    console.error('Get image details error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { 
  cloudinary, 
  uploadImage, 
  uploadMultipleImages, 
  deleteImage, 
  deleteMultipleImages, 
  getImageDetails 
};
