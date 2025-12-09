const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');
const axios = require('axios');
const auth = require('../middleware/auth');

// @route   GET /api/utils/metadata
// @desc    Get metadata for a URL
// @access  Private
router.get('/metadata', auth, async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid URL' });
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'WhaTele-Chat-Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 5000 // 5 second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      url: $('meta[property="og:url"]').attr('content') || url,
      siteName: $('meta[property="og:site_name"]').attr('content') || ''
    };

    // If image is relative, make it absolute
    if (metadata.image && !metadata.image.startsWith('http')) {
      const urlObj = new URL(url);
      metadata.image = `${urlObj.protocol}//${urlObj.host}${metadata.image}`;
    }

    res.json(metadata);
  } catch (error) {
    console.error('Metadata fetch error:', error.message);
    // Don't return 500, just return empty metadata so UI doesn't break
    res.json({ title: '', description: '', image: '', url: req.query.url });
  }
});

module.exports = router;
