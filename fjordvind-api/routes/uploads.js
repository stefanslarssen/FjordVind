// Image Upload Routes - Database Backed
// Stores image metadata in PostgreSQL, files on disk

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

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

/**
 * POST /api/upload/fish-image - Upload single image for fish observation
 */
router.post('/fish-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ingen fil lastet opp' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const { observationId, sampleId } = req.body;
    const userId = req.user?.id || null;

    // Insert into database
    const result = await pool.query(
      `INSERT INTO images (filename, original_name, mimetype, size_bytes, url, sample_id, observation_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, filename, url, created_at`,
      [
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        imageUrl,
        sampleId || null,
        observationId || null,
        userId
      ]
    );

    const image = result.rows[0];
    console.log(`Image uploaded to database: ${req.file.filename} (id: ${image.id})`);

    res.json({
      success: true,
      message: 'Bilde lastet opp',
      image: {
        id: image.id,
        url: image.url,
        filename: image.filename,
        created_at: image.created_at
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);

    // Cleanup file on DB error
    if (req.file) {
      const filePath = path.join(uploadsDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Fallback for missing table
    if (error.code === '42P01') {
      const imageUrl = `/uploads/${req.file.filename}`;
      return res.json({
        success: true,
        message: 'Bilde lastet opp (uten database)',
        image: {
          id: `temp-${Date.now()}`,
          url: imageUrl,
          filename: req.file.filename
        },
        _warning: 'Images-tabell mangler i database. Kjør supabase-setup.sql for å opprette.'
      });
    }

    res.status(500).json({ error: 'Kunne ikke laste opp bildet' });
  }
});

/**
 * POST /api/upload/images - Upload multiple images
 */
router.post('/images', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Ingen filer lastet opp' });
    }

    const { sampleId, treatmentId } = req.body;
    const userId = req.user?.id || null;
    const uploadedImages = [];

    for (const file of req.files) {
      const imageUrl = `/uploads/${file.filename}`;

      try {
        const result = await pool.query(
          `INSERT INTO images (filename, original_name, mimetype, size_bytes, url, sample_id, treatment_id, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, filename, url, original_name, created_at`,
          [
            file.filename,
            file.originalname,
            file.mimetype,
            file.size,
            imageUrl,
            sampleId || null,
            treatmentId || null,
            userId
          ]
        );

        const image = result.rows[0];
        uploadedImages.push({
          id: image.id,
          url: image.url,
          filename: image.filename,
          originalName: image.original_name,
          created_at: image.created_at
        });
      } catch (dbError) {
        console.error('DB error for file:', file.filename, dbError.message);
        // Still track the upload even if DB fails
        uploadedImages.push({
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: imageUrl,
          filename: file.filename,
          originalName: file.originalname,
          _dbError: true
        });
      }
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

/**
 * GET /api/images - Get images for a sample, treatment, or observation
 */
router.get('/', async (req, res) => {
  try {
    const { sampleId, treatmentId, observationId } = req.query;

    let query = `
      SELECT id, filename, original_name, mimetype, size_bytes, url,
             sample_id, observation_id, treatment_id, uploaded_by, created_at
      FROM images
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (sampleId) {
      query += ` AND sample_id = $${paramCount}`;
      params.push(sampleId);
      paramCount++;
    }
    if (treatmentId) {
      query += ` AND treatment_id = $${paramCount}`;
      params.push(treatmentId);
      paramCount++;
    }
    if (observationId) {
      query += ` AND observation_id = $${paramCount}`;
      params.push(observationId);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);

    res.json({
      images: rows.map(img => ({
        id: img.id,
        filename: img.filename,
        originalName: img.original_name,
        mimetype: img.mimetype,
        size: img.size_bytes,
        url: img.url,
        sampleId: img.sample_id,
        observationId: img.observation_id,
        treatmentId: img.treatment_id,
        uploadedBy: img.uploaded_by,
        createdAt: img.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching images:', error);

    // Fallback for missing table
    if (error.code === '42P01') {
      return res.json({
        images: [],
        _warning: 'Images-tabell mangler. Kjør supabase-setup.sql.'
      });
    }

    res.status(500).json({ error: 'Kunne ikke hente bilder' });
  }
});

/**
 * GET /api/images/:imageId - Get single image metadata
 */
router.get('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    const { rows } = await pool.query(
      `SELECT id, filename, original_name, mimetype, size_bytes, url,
              sample_id, observation_id, treatment_id, uploaded_by, created_at
       FROM images WHERE id = $1`,
      [imageId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bilde ikke funnet' });
    }

    const img = rows[0];
    res.json({
      id: img.id,
      filename: img.filename,
      originalName: img.original_name,
      mimetype: img.mimetype,
      size: img.size_bytes,
      url: img.url,
      sampleId: img.sample_id,
      observationId: img.observation_id,
      treatmentId: img.treatment_id,
      uploadedBy: img.uploaded_by,
      createdAt: img.created_at
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Kunne ikke hente bilde' });
  }
});

/**
 * DELETE /api/images/:imageId - Delete an image
 */
router.delete('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    // Get image info first
    const { rows } = await pool.query(
      'SELECT id, filename FROM images WHERE id = $1',
      [imageId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bilde ikke funnet' });
    }

    const image = rows[0];

    // Delete from database
    await pool.query('DELETE FROM images WHERE id = $1', [imageId]);

    // Delete file from disk
    const filePath = path.join(uploadsDir, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log(`Image deleted: ${image.filename} (id: ${imageId})`);

    res.json({
      success: true,
      message: 'Bilde slettet'
    });
  } catch (error) {
    console.error('Error deleting image:', error);

    // Fallback for missing table - try to delete just the file
    if (error.code === '42P01') {
      return res.status(500).json({
        error: 'Kunne ikke slette bildet',
        _warning: 'Images-tabell mangler. Kjør supabase-setup.sql.'
      });
    }

    res.status(500).json({ error: 'Kunne ikke slette bildet' });
  }
});

/**
 * PUT /api/images/:imageId - Update image metadata (link to sample/observation)
 */
router.put('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { sampleId, observationId, treatmentId } = req.body;

    const { rows } = await pool.query(
      `UPDATE images
       SET sample_id = COALESCE($1, sample_id),
           observation_id = COALESCE($2, observation_id),
           treatment_id = COALESCE($3, treatment_id)
       WHERE id = $4
       RETURNING id, filename, url, sample_id, observation_id, treatment_id`,
      [sampleId, observationId, treatmentId, imageId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bilde ikke funnet' });
    }

    res.json({
      success: true,
      message: 'Bilde oppdatert',
      image: rows[0]
    });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere bildet' });
  }
});

// Export for use in other modules
module.exports = router;
module.exports.uploadsDir = uploadsDir;
