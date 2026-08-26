import re

with open('server/index.ts', 'r') as f:
    content = f.read()

content = content.replace("import { createServer as createViteServer } from 'vite';", "")
content = content.replace("const PORT = 3000;", "const PORT = Number(process.env.PORT) || 3000;")

with open('server/index.ts', 'w') as f:
    f.write(content)
