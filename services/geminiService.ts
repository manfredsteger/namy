
import { GoogleGenAI } from "@google/genai";

export const generateRenameScript = async (prompt: string): Promise<string> => {
  if (!prompt) {
    throw new Error("Prompt cannot be empty.");
  }

  // This check is a safeguard. The API key should be set in the environment.
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const fullPrompt = `
You are an expert JavaScript developer. Your task is to write the body of a JavaScript function that renames file paths.

The function signature is: (path, isDirectory, providerCode, tags) => string

- \`path\`: A string representing the original file or directory path (e.g., "My Documents/Photos_2024/IMG_001.JPG"). Paths use forward slashes as separators.
- \`isDirectory\`: A boolean that is \`true\` if the path is for a directory, and \`false\` if it is for a file.
- \`providerCode\`: An optional string like "tmdbid-1234", only set for media conventions.
- \`tags\`: For audio files, an object with the cleaned music metadata: \`{ artist, albumArtist, album, title, track, disc, discTotal, year, albumFromTags }\`. Undefined for everything else, so always guard with \`tags &&\`.
- The function MUST return a new string representing the renamed path.
- You can only use standard browser-compatible JavaScript (ES2020). Do not use any Node.js-specific APIs like \`fs\` or \`path\`.
- Manipulate the path string to achieve the desired renaming. Common operations involve \`.split('/')\`, \`.join('/')\`, string replacement, and changing case.

You must only provide the code for the function body. Do not include the function definition \`function(path, isDirectory) { ... }\` or any surrounding markdown code fences like \`\`\`javascript.

Here is the user's request for the renaming logic:
"${prompt}"

Example Request: "make everything lowercase and replace spaces with underscores"
Example Output:
return path.toLowerCase().replace(/\\s+/g, '_');

Example Request: "For files, prepend the date '2024-01-01-' to the filename. Leave directories unchanged."
Example Output:
if (isDirectory) {
  return path;
}
const parts = path.split('/');
const filename = parts.pop();
parts.push('2024-01-01-' + filename);
return parts.join('/');
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate script from AI. Please check your API key and network connection.");
  }
};
