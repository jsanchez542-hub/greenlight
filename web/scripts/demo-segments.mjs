import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MARKER = '__next.';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  });
}

function segmentFolders(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (!entry.isDirectory()) {
      return [];
    }
    return entry.name.startsWith(MARKER) ? [full] : segmentFolders(full);
  });
}

/**
 * The router asks for the pieces of a page by a name with dots in it, such as
 * `checks/__next.KEY.checks.__PAGE__.txt`, and the export writes the same pieces in folders,
 * `checks/__next.KEY/checks/__PAGE__.txt`. A host that cannot rewrite addresses, like GitHub Pages,
 * would answer the first with a 404. This writes each piece under the name that is asked for as
 * well, and leaves the folders where they are.
 */
export function addFlatSegmentNames(directory) {
  let written = 0;
  for (const folder of segmentFolders(directory)) {
    const parent = path.dirname(folder);
    const key = path.basename(folder);
    for (const file of files(folder)) {
      const inside = path.relative(folder, file).split(path.sep).join('.');
      const flat = path.join(parent, `${key}.${inside}`);
      if (!existsSync(flat)) {
        copyFileSync(file, flat);
        written += 1;
      }
    }
  }
  return written;
}
