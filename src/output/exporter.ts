import * as fs from "fs";
import * as path from "path";
import { ExportError } from "../errors";

export async function saveExport(response: Response): Promise<string> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/csv")) {
    throw new ExportError();
  }

  const body = await response.text();
  if (!body) {
    throw new ExportError();
  }

  const datePart = new Date().toISOString().replace(/:/g, "-").split(".")[0];
  const filename = `profiles-export-${datePart}.csv`;
  const filePath = path.join(process.cwd(), filename);

  fs.writeFileSync(filePath, body);

  return filePath;
}
