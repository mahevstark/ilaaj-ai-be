const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'df2jfaqf2',
  api_key: '472611185961462',
  api_secret: 'AUIvMwFDhI1jZmPToLo_fDiAiao'
});

// Configure multer for Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' }
    ]
  }
});

const upload = multer({ storage: storage });

// Upload avatar endpoint
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('✅ Avatar uploaded successfully:', {
      publicId: req.file.public_id,
      url: req.file.path,
      folder: 'avatars'
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: req.file.path,
      publicId: req.file.public_id
    });

  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: error.message
    });
  }
});

// Delete avatar endpoint
router.delete('/avatar/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Avatar deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }
  } catch (error) {
    console.error('❌ Avatar deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete avatar',
      error: error.message
    });
  }
});

module.exports = router;
