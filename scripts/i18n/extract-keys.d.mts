export interface ExtractedKey {
  key: string;
  plural: boolean;
  files: string[];
}
export function extractKeys(root?: string): ExtractedKey[];
