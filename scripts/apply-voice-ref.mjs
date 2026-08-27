import fs from 'node:fs';

const path = 'App.js';
let source = fs.readFileSync(path, 'utf8');
if (source.includes('const voiceResultHandlerRef')) {
  console.log('voiceResultHandlerRef already declared');
} else if (!source.includes('const voiceLoopActiveRef = useRef(false);')) {
  throw new Error('App.js is missing voiceLoopActiveRef; cannot declare voiceResultHandlerRef');
} else {
  source = source.replace(
    '  const voiceLoopActiveRef = useRef(false);\n',
    '  const voiceLoopActiveRef = useRef(false);\n  const voiceResultHandlerRef = useRef(null);\n',
  );
  fs.writeFileSync(path, source);
  console.log('voiceResultHandlerRef declared');
}
