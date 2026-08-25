import { Rule } from './types';

export function generateScriptFromRules(rules: Rule[]): string {
  let script = `
// Auto-generated from visual recipe
if (isDirectory) return path;
let newPath = path;
const parts = newPath.split('/');
let filename = parts.pop() || '';

`;

  for (const rule of rules) {
    switch (rule.type) {
      case 'lowercase':
        script += `filename = filename.toLowerCase();\n`;
        break;
      case 'uppercase':
        script += `filename = filename.toUpperCase();\n`;
        break;
      case 'remove_spaces':
        script += `filename = filename.replace(/\\s+/g, '-');\n`;
        break;
      case 'replace':
        const findStr = rule.params?.find || '';
        const replaceStr = rule.params?.replaceWith || '';
        // If findStr looks like a regex, use it, otherwise simple string replace all (using split.join)
        script += `
try {
  let isRegex = ${findStr.startsWith('/') && findStr.endsWith('/')};
  if (isRegex) {
     const regexBody = ${JSON.stringify(findStr)}.slice(1, -1);
     filename = filename.replace(new RegExp(regexBody, 'g'), ${JSON.stringify(replaceStr)});
  } else {
     filename = filename.split(${JSON.stringify(findStr)}).join(${JSON.stringify(replaceStr)});
  }
} catch (e) {
  // Regex error, ignore
}
`;
        break;
      case 'prefix':
        script += `filename = ${JSON.stringify(rule.params?.text || '')} + filename;\n`;
        break;
      case 'suffix':
        script += `
{
  const extMatch = filename.match(/(\\.[^.]+)$/);
  const ext = extMatch ? extMatch[1] : '';
  const base = extMatch ? filename.slice(0, -ext.length) : filename;
  filename = base + ${JSON.stringify(rule.params?.text || '')} + ext;
}\n`;
        break;
    }
  }

  script += `\nparts.push(filename);\nreturn parts.join('/');`;
  return script;
}
