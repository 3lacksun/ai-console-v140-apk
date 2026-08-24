export function createSseParser(onData) {
  let lineBuffer = '';

  const processLine = (rawLine) => {
    const line = rawLine.trim();
    if (!line || !line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      onData(JSON.parse(data));
    } catch (_) {
      // A complete malformed event is discarded without affecting adjacent events.
    }
  };

  return {
    push(chunk = '', flush = false) {
      const combined = lineBuffer + chunk;
      const lines = combined.split(/\r?\n/);
      if (flush) lineBuffer = '';
      else lineBuffer = lines.pop() || '';
      for (const line of lines) processLine(line);
      if (flush && lineBuffer === '' && lines.length === 0 && combined) processLine(combined);
      else if (flush && combined && !combined.includes('\n')) processLine(combined);
    },
    flush() {
      if (!lineBuffer) return;
      const pending = lineBuffer;
      lineBuffer = '';
      processLine(pending);
    },
    getBufferedLength() {
      return lineBuffer.length;
    },
  };
}
