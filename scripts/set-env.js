const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
const targetDir = path.dirname(targetPath);

let envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || envVars['SUPABASE_URL'] || '';
const supabaseKey = process.env.SUPABASE_KEY || envVars['SUPABASE_KEY'] || '';

const environmentFileContent = `// Generado automáticamente por scripts/set-env.js a partir de .env
export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(targetPath, environmentFileContent, 'utf8');
console.log('✅ Archivo environment.ts generado correctamente desde .env');
