import express from 'express'
import { upload } from '../config/cloudinary.js'

const router = express.Router()

// POST /api/upload — upload one image
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' })
    }
    res.json({
      url: req.file.path,
      public_id: req.file.filename,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router