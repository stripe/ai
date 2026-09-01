import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
} from 'node:fs';
import { TRANSCRIPT_READ_CHUNK_BYTES } from './constants.mjs';

export function lastTurnMentioned(pattern, event) {
  return (
    matchesPattern(event?.last_assistant_message, pattern) ||
    transcriptLastTurnMatches(event?.transcript_path, pattern)
  );
}

function valueAsText(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return JSON.stringify(value);
}

function matchesPattern(value, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(valueAsText(value));
}

function contentBlockAsText(block) {
  if (typeof block === 'string') {
    return block;
  }
  if (!block || typeof block !== 'object') {
    return '';
  }

  if (block.type === 'text') {
    return valueAsText(block.text);
  }
  if (block.type === 'tool_use') {
    return `${valueAsText(block.name)}\n${valueAsText(block.input)}`;
  }
  if (block.type === 'tool_result') {
    return contentAsText(block.content);
  }
  return '';
}

function contentAsText(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content.map(contentBlockAsText).join('\n');
}

function hookOutputAsText(attachment) {
  if (
    typeof attachment?.type !== 'string' ||
    !attachment.type.startsWith('hook_')
  ) {
    return '';
  }

  return [
    attachment.content,
    attachment.stdout,
    attachment.stderr,
  ]
    .map(valueAsText)
    .join('\n');
}

function transcriptEntryText(entry) {
  return [
    contentAsText(entry?.message?.content),
    hookOutputAsText(entry?.attachment),
  ].join('\n');
}

function isHumanPrompt(entry) {
  if (
    entry?.type !== 'user' ||
    entry.isMeta === true ||
    entry.isSynthetic === true
  ) {
    return false;
  }

  const content = entry.message?.content;
  if (typeof content === 'string') {
    return true;
  }
  return (
    Array.isArray(content) &&
    content.some((block) => block?.type !== 'tool_result')
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

function* latestTurnEntries(transcriptPath) {
  for (const line of readLinesFromEnd(transcriptPath)) {
    const entry = parseTranscriptLine(line);
    if (!entry) {
      continue;
    }

    yield entry;
    if (isHumanPrompt(entry)) {
      return;
    }
  }
}

function transcriptLastTurnMatches(transcriptPath, pattern) {
  if (typeof transcriptPath !== 'string' || !transcriptPath) {
    return false;
  }

  for (const entry of latestTurnEntries(transcriptPath)) {
    if (matchesPattern(transcriptEntryText(entry), pattern)) {
      return true;
    }
  }
  return false;
}
