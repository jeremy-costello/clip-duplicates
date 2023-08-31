const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT;
const rootPath = process.env.ROOT_PATH;

app.use(cors());
app.use(express.json());

app.use(express.static(rootPath));

app.get('/api/folder', async (req, res) => {
  try {
    const folderPath = req.query.path;
    const fullPath = path.join(rootPath, folderPath);
    const folderContent = await fs.readdir(fullPath, { withFileTypes: true });

    const contentData = folderContent.map(item => ({
      name: item.name,
      type: item.isDirectory() ? 'folder' : 'file'
    }));

    res.json(contentData);
  } catch (error) {
    console.error('Error reading folder:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

async function closeGracefully(signal) {
  console.log(`Received signal to terminate: ${signal}`);

  try {
    await server.close();
    console.log('Server closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error while closing the server:', err);
    process.exit(1);
  }
}

process.once('SIGINT', closeGracefully)
process.once('SIGTERM', closeGracefully)
