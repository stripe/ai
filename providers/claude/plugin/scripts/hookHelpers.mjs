export async function readHookEvent(input = process.stdin) {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawEvent = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawEvent) {
    throw new Error('Hook event input is empty');
  }

  const event = JSON.parse(rawEvent);
  if (event === null || Array.isArray(event) || typeof event !== 'object') {
    throw new Error('Hook event must be a JSON object');
  }
  return event;
}

export function getHookArguments(event) {
  const argumentsValue = event?.tool_input;
  return argumentsValue !== null &&
    !Array.isArray(argumentsValue) &&
    typeof argumentsValue === 'object'
    ? argumentsValue
    : {};
}

export function sample(rate, random = Math.random) {
  return random() < rate;
}

export function emitHookContext(hookEventName, message) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        additionalContext: message,
      },
    }),
  );
}

export async function runHook(callback) {
  try {
    await callback();
  } catch {
    // Feedback guidance must never interrupt the agent's work.
  }
}
