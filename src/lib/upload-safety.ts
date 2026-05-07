// Whitelist of safe file extensions and matching MIME types for user uploads.
// This prevents uploading executables/scripts that could be used to deliver malware.
export const SAFE_FILE_EXTENSIONS = [
  // Documents
  "pdf", "doc", "docx", "odt", "rtf", "txt", "md",
  "xls", "xlsx", "ods", "csv",
  "ppt", "pptx", "odp",
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "bmp",
  // Audio / video
  "mp3", "wav", "ogg", "m4a",
  "mp4", "webm", "mov", "mkv",
  // Archives (commonly used for class materials)
  "zip", "rar", "7z",
];

const BLOCKED_EXTENSIONS = [
  "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "vbs", "vbe", "js", "jse",
  "wsf", "wsh", "lnk", "jar", "apk", "app", "dmg", "deb", "rpm", "sh", "bash",
  "py", "pyc", "rb", "pl", "php", "phtml", "asp", "aspx", "jsp", "html", "htm",
  "svg" /* allowed by default but can carry script - still permit, but warn? */,
  "dll", "so", "bin", "iso", "img", "vbox",
];

export function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function isSafeUploadFile(file: File): boolean {
  const ext = getExt(file.name);
  if (!ext) return false;
  if (BLOCKED_EXTENSIONS.includes(ext)) return false;
  return SAFE_FILE_EXTENSIONS.includes(ext);
}

// Image-only validation (used for question images)
export const SAFE_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
export const SAFE_IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) return "Rasm 5 MB dan oshmasligi kerak";
  const ext = getExt(file.name);
  if (!SAFE_IMAGE_EXTENSIONS.includes(ext)) return "Faqat JPG, PNG, GIF, WEBP";
  if (file.type && !SAFE_IMAGE_MIMES.includes(file.type)) return "Noto'g'ri rasm formati";
  return null;
}

export const SAFE_UPLOAD_ACCEPT = SAFE_FILE_EXTENSIONS.map((e) => "." + e).join(",");
export const SAFE_IMAGE_ACCEPT = SAFE_IMAGE_EXTENSIONS.map((e) => "." + e).join(",");
