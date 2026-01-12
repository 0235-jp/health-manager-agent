/**
 * プラグインのZIPファイルを作成するスクリプト
 */

import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '..');

// manifest.jsonを読み込んでバージョンを取得
const manifestPath = path.join(pluginRoot, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const zipFileName = `${manifest.name}-v${manifest.version}.zip`;
const outputPath = path.join(pluginRoot, 'dist', zipFileName);

// distディレクトリを確認
const distDir = path.join(pluginRoot, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

// ZIPファイルを作成
const zip = new AdmZip();

// 必要なファイルを追加
zip.addLocalFile(path.join(pluginRoot, 'manifest.json'));
zip.addLocalFile(path.join(pluginRoot, 'package.json'));
zip.addLocalFolder(path.join(pluginRoot, 'dist'), 'dist');

// ZIPファイルを保存
zip.writeZip(outputPath);

console.log(`Created: ${outputPath}`);
