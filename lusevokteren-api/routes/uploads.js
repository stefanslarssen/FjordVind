// Image Upload Routes

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `fish-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Ugyldig filtype. Kun JPEG, PNG, GIF og WebP er tillatt.'));
    }
  }
});

// In-memory store for uploaded images
const imageStore = {};

// Upload single image for fish observation
router.post('/fish-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ingen fil lastet opp' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const { observationId, sampleId } = req.body;

    const imageId = `img-${Date.now()}`;
    imageStore[imageId] = {
      id: imageId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: imageUrl,
      observationId: observationId || null,
      sampleId: sampleId || null,
      uploadedAt: new Date().toISOString()
    };

    console.log(`Image uploaded: ${req.file.filename}`);

    res.json({
      success: true,
      message: 'Bilde lastet opp',
      image: {
        id: imageId,
        url: imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Kunne ikke laste opp bildet' });
  }
});

// Upload multiple images
router.post('/images', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Ingen filer lastet opp' });
    }

    const { sampleId, treatmentId } = req.body;
    const uploadedImages = [];

    for (const file of req.files) {
      const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const imageUrl = `/uploads/${file.filename}`;

      imageStore[imageId] = {
        id: imageId,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: imageUrl,
        sampleId: sampleId || null,
        treatmentId: treatmentId || null,
        uploadedAt: new Date().toISOString()
      };

      uploadedImages.push({
        id: imageId,
        url: imageUrl,
        filename: file.filename,
        originalName: file.originalname
      });
    }

    console.log(`${uploadedImages.length} images uploaded`);

    res.json({
      success: true,
      message: `${uploadedImages.length} bilder lastet opp`,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Kunne ikke laste opp bildene' });
  }
});

// Get images for a sample or treatment
router.get('/', async (req, res) => {
  try {
    const { sampleId, treatmentId, observationId } = req.query;

    let images = Object.values(imageStore);

    if (sampleId) {
      images = images.filter(img => img.sampleId === sampleId);
    }
    if (treatmentId) {
      images = images.filter(img => img.treatmentId === treatmentId);
    }
    if (observationId) {
      images = images.filter(img => img.observationId === observationId);
    }

    res.json({ images });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Kunne ikke hente bilder' });
  }
});

// Delete an image
router.delete('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const image = imageStore[imageId];

    if (!image) {
      return res.status(404).json({ error: 'Bilde ikke funnet' });
    }

    // Delete file from disk
    const filePath = path.join(uploadsDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from store
    delete imageStore[imageId];

    console.log(`Image deleted: ${image.filename}`);

    res.json({
      success: true,
      message: 'Bilde slettet'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Kunne ikke slette bildet' });
  }
});

// Export for use in other modules
module.exports = router;
module.exports.imageStore = imageStore;
module.exports.uploadsDir = uploadsDir;
