import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { TRANSCRIPT_READ_CHUNK_BYTES } from './constants.mjs';

export function valueAsText(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return JSON.stringify(value);
}

export function matchesPattern(value, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(valueAsText(value));
}

export function lastTurnMentioned(pattern, event, adapter) {
  return (
    matchesPattern(event?.lastAssistantMessage, pattern) ||
    transcriptLastTurnMatches(event?.transcriptPath, pattern, adapter)
  );
}

function parseTranscriptLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function* readLinesFromEnd(transcriptPath) {
  const file = openSync(transcriptPath, 'r');

  try {
    let position = fstatSync(file).size;
    let leadingBytes = Buffer.alloc(0);

    while (position > 0) {
      const bytesToRead = Math.min(TRANSCRIPT_READ_CHUNK_BYTES, position);
      position -= bytesToRead;

      const chunk = Buffer.allocUnsafe(bytesToRead);
      const bytesRead = readSync(file, chunk, 0, bytesToRead, position);
      const buffered = Buffer.concat([
        chunk.subarray(0, bytesRead),
        leadingBytes,
      ]);
      let lineEnd = buffered.length;

      for (let index = buffered.length - 1; index >= 0; index -= 1) {
        if (buffered[index] !== 0x0a) {
          continue;
        }

        const line = buffered.subarray(index + 1, lineEnd);
        if (line.length > 0) {
          yield line.toString('utf8');
        }
        lineEnd = index;
      }

      leadingBytes = Buffer.from(buffered.subarray(0, lineEnd));
    }

    if (leadingBytes.length > 0) {
      yield leadingBytes.toString('utf8');
    }
  } finally {
    closeSync(file);
  }
}

function transcriptLastTurnMatches(transcriptPath, pattern, adapter) {
  if (typeof transcriptPath !== 'string' || !transcriptPath) {
    return false;
  }

  let matched = false;
  for (const line of readLinesFromEnd(transcriptPath)) {
    const raw = parseTranscriptLine(line);
    if (!raw) {
      continue;
    }

    const entry = adapter.normalizeTranscriptEntry(raw);
    if (matchesPattern(entry.text, pattern)) {
      matched = true;
    }
    if (entry.isHumanPrompt) {
      return matched;
    }
  }
  return false;
}
