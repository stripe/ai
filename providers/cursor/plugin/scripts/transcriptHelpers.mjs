import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
} from 'node:fs';
import { TRANSCRIPT_READ_CHUNK_BYTES } from './constants.mjs';

export function lastAssistantTurnToolCalls(event) {
  const transcriptPath = event?.transcript_path;
  if (typeof transcriptPath !== 'string' || !transcriptPath) {
    return [];
  }

  const toolCalls = [];

  for (const line of readLinesFromEnd(transcriptPath)) {
    const entry = parseTranscriptLine(line);
    if (!entry) {
      continue;
    }

    const content = entry.message?.content;
    if (entry.role === 'assistant' && Array.isArray(content)) {
      toolCalls.push(
        ...content.filter((block) => block?.type === 'tool_use'),
      );
    }
    if (isHumanPrompt(entry)) {
      break;
    }
  }
  return toolCalls;
}

function isHumanPrompt(entry) {
  if (entry?.role !== 'user') {
    return false;
  }

  const content = entry.message?.content;
  return (
    Array.isArray(content) &&
    content.some((block) => block?.type === 'text')
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
      const bytesToRead = Math.min(
        TRANSCRIPT_READ_CHUNK_BYTES,
        position,
      );
      position -= bytesToRead;

      const chunk = Buffer.allocUnsafe(bytesToRead);
      const bytesRead = readSync(
        file,
        chunk,
        0,
        bytesToRead,
        position,
      );
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
