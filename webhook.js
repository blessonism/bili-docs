const http = require('http');
const { execSync, exec } = require('child_process');
const crypto = require('crypto');

const PORT = 9877;
const SECRET = crypto.randomBytes(16).toString('hex');
const PROJECT_DIR = '/root/projects/bili-docs-v2';

console.log(`Webhook secret: ${SECRET}`);
console.log(`Listening on port ${PORT}`);

let deploying = false;

http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    return res.end('Not found');
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // Verify signature
    const sig = req.headers['x-hub-signature-256'];
    if (sig) {
      const hmac = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
      if (sig !== `sha256=${hmac}`) {
        res.writeHead(403);
        return res.end('Invalid signature');
      }
    }

    if (deploying) {
      res.writeHead(429);
      return res.end('Deploy already in progress');
    }

    deploying = true;
    res.writeHead(200);
    res.end('Deploy started');

    console.log(`[${new Date().toISOString()}] Deploy triggered`);
    exec(`cd ${PROJECT_DIR} && git pull origin main && ./deploy.sh`, {
      timeout: 600000,
      maxBuffer: 10 * 1024 * 1024,
    }, (err, stdout, stderr) => {
      deploying = false;
      if (err) {
        console.error(`[${new Date().toISOString()}] Deploy failed:`, err.message);
        console.error(stderr);
      } else {
        console.log(`[${new Date().toISOString()}] Deploy success`);
        console.log(stdout.split('\n').slice(-5).join('\n'));
      }
    });
  });
}).listen(PORT);
