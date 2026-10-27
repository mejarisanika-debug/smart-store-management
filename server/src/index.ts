import { config } from './config.js';
import app from './app.js';

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(` Smart Store Management System — Express Backend Active`);
  console.log(` Port: ${PORT}`);
  console.log(` Health: http://localhost:${PORT}/api/health`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`================================================================`);
});
