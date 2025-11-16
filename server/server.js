const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Enable CORS for image serving
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `smile-${timestamp}${ext}`);
  }
});
const upload = multer({ storage });

let totalCount = 0;
let cameras = [];

// API endpoint to receive photos from camera software
app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;
    const camera = cameras.find(c => c.apiKey === apiKey);
    
    totalCount++;
    const imageUrl = `http://localhost:3001/images/${req.file.filename}`;

    console.log(`📸 New smile uploaded: ${req.file.filename} (Total: ${totalCount})`);
    if (camera) {
      console.log(`📍 From: ${camera.name} (${camera.location})`);
      camera.captureCount = (camera.captureCount || 0) + 1;
      camera.lastCapture = new Date().toISOString();
    }
    console.log(`🔗 Broadcasting URL: ${imageUrl}`);

    // Broadcast to all connected clients
    const payload = {
      event: 'new_smile',
      image: imageUrl,
      total_count: totalCount,
      camera: camera ? { name: camera.name, location: camera.location } : null
    };
    console.log('📡 Payload:', JSON.stringify(payload));
    io.emit('new_smile', payload);

    res.json({ success: true, url: imageUrl, total: totalCount });
  } catch (error) {
    console.error('❌ Upload failed:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// Test endpoint to simulate camera capture
app.post('/test-smile', (req, res) => {
  totalCount++;
  const mockImageUrl = `http://localhost:3001/images/test-${totalCount}.jpg`;

  console.log(`🧪 Test smile triggered (Total: ${totalCount})`);

  io.emit('new_smile', {
    event: 'new_smile',
    image: mockImageUrl,
    total_count: totalCount
  });

  res.json({ success: true, message: 'Test smile sent', total: totalCount });
});

// Get current count
app.get('/count', (req, res) => {
  res.json({ total_count: totalCount });
});

// Get recent images
app.get('/recent-images', (req, res) => {
  try {
    const files = fs.readdirSync(imagesDir)
      .filter(f => f.startsWith('smile-') && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(imagesDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 20)
      .map(f => `http://localhost:3001/images/${f.name}`);
    
    res.json({ images: files, total_count: totalCount });
  } catch (error) {
    console.error('Error reading images:', error);
    res.json({ images: [], total_count: totalCount });
  }
});

// Camera Management APIs
app.get('/cameras', (req, res) => {
  res.json({ cameras });
});

app.post('/cameras', (req, res) => {
  const { name, location, apiKey } = req.body;
  
  if (!name || !location || !apiKey) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const newCamera = {
    id: Date.now().toString(),
    name,
    location,
    apiKey,
    active: true,
    captureCount: 0,
    createdAt: new Date().toISOString()
  };

  cameras.push(newCamera);
  console.log(`📹 New camera added: ${name} (${location})`);
  
  res.json({ success: true, camera: newCamera });
});

app.delete('/cameras/:id', (req, res) => {
  const { id } = req.params;
  const index = cameras.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Camera not found' });
  }

  const deleted = cameras.splice(index, 1)[0];
  console.log(`🗑️ Camera deleted: ${deleted.name}`);
  
  res.json({ success: true, message: 'Camera deleted' });
});

app.patch('/cameras/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  const camera = cameras.find(c => c.id === id);
  
  if (!camera) {
    return res.status(404).json({ success: false, message: 'Camera not found' });
  }

  camera.active = active;
  console.log(`📹 Camera ${active ? 'enabled' : 'disabled'}: ${camera.name}`);
  
  res.json({ success: true, camera });
});

// Clear all images
app.post('/clear-images', (req, res) => {
  try {
    const files = fs.readdirSync(imagesDir)
      .filter(f => f.startsWith('smile-') && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')));
    
    let deletedCount = 0;
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(imagesDir, file));
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete ${file}:`, err);
      }
    });
    
    totalCount = 0;
    console.log(`🗑️ Cleared ${deletedCount} images. Counter reset.`);
    
    // Notify all clients
    io.emit('wall_cleared', { total_count: 0 });
    
    res.json({ success: true, deleted: deletedCount, message: `Cleared ${deletedCount} images` });
  } catch (error) {
    console.error('❌ Clear failed:', error);
    res.status(500).json({ success: false, message: 'Clear failed', error: error.message });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // Send current count on connection (without image to avoid undefined)
  socket.emit('initial_count', { 
    total_count: totalCount 
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 Smile Wall Server Running');
  console.log('================================');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`📤 Upload: POST http://localhost:${PORT}/upload`);
  console.log(`🧪 Test: POST http://localhost:${PORT}/test-smile`);
  console.log('================================');
  console.log('');
});
