import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMAS_DIR = path.join(__dirname, 'schemas');
const RESPONSES_DIR = path.join(__dirname, 'responses');

const loadAllYamlSchemas = (dirPath: string) => {
  const schemas: Record<string, any> = {};

  if (!fs.existsSync(dirPath)) {
    console.error(`❌ Schemas directory not found: ${dirPath}`);
    return schemas;
  }

  try {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      if (file.endsWith('.yaml')) {
        const schemaName = path.basename(file, '.yaml');
        const filePath = path.join(dirPath, file);

        try {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          schemas[schemaName] = yaml.load(fileContents);
        } catch (error) {
          console.error(`❌ Error loading schema: ${file}`, error);
        }
      }
    });
  } catch (error) {
    console.error(`❌ Error reading directory: ${dirPath}`, error);
  }

  return schemas;
};

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shared House API',
      version: '1.0.0',
      description: 'API for a shared house',
    },
    components: {
      schemas: loadAllYamlSchemas(SCHEMAS_DIR),
      responses: loadAllYamlSchemas(RESPONSES_DIR),
    },
  },
  apis: ['./src/modules/**/*controller.ts'],
};
