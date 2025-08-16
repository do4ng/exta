import * as fs from 'node:fs';
import * as path from 'node:path';

export function scanDirectory(directoryPath: string, fileList: string[] = []): string[] {
  const items = fs.readdirSync(directoryPath);

  items.forEach((item) => {
    const fullPath = path.join(directoryPath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  });

  return fileList;
}
