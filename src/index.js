import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(__dirname))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
})

app.get('/src', (req, res) => {
  res.sendFile(__dirname);
});


app.listen(5500, () => {
  console.log('Server running at http://127.0.0.1:5500');
})