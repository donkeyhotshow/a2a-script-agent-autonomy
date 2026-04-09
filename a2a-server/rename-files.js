import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function renameFiles() {
  try {
    // Read and parse the JSON schema
    const schemaPath = path.join(__dirname, "rename-schema.json");
    const schemaContent = await fs.readFile(schemaPath, "utf8");
    const schema = JSON.parse(schemaContent);

    // Validate schema format
    if (typeof schema !== "object" || schema === null) {
      throw new Error("Invalid JSON schema: must be an object");
    }

    // Process renames sequentially
    for (const [oldName, newName] of Object.entries(schema)) {
      if (typeof oldName !== "string" || typeof newName !== "string") {
        console.error(`Skipping invalid entry: ${oldName} -> ${newName}`);
        continue;
      }

      const oldPath = path.join(__dirname, oldName);
      const newPath = path.join(__dirname, newName);

      try {
        // Check if old file exists
        await fs.access(oldPath);

        // Check if new file already exists
        try {
          await fs.access(newPath);
          console.error(`Skipping: ${newName} already exists`);
          continue;
        } catch {
          // New file doesn't exist, proceed
        }

        // Rename the file
        await fs.rename(oldPath, newPath);
        console.log(`Renamed: ${oldName} -> ${newName}`);
      } catch (error) {
        if (error.code === "ENOENT") {
          console.warn(`File not found: ${oldName}`);
        } else {
          console.error(`Error renaming ${oldName}: ${error.message}`);
        }
      }
    }

    console.log("Renaming process completed.");
  } catch (error) {
    console.error(`Script error: ${error.message}`);
    process.exit(1);
  }
}

renameFiles();
