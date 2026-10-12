export const CLI_COMMAND_TIMEOUT_MS = 3_000;
export const PER_TOOL_FEEDBACK_SAMPLE_RATE = 0.001;
export const PER_TURN_FEEDBACK_SAMPLE_RATE = 0.01;
export const TRANSCRIPT_READ_CHUNK_BYTES = 64 * 1024;

// Types of hook events
export const SESSION_START = "session-start";
export const TOOL_COMPLETED = "tool-completed";
export const TOOL_FAILED = "tool-failed";
export const TOOL_BATCH_COMPLETED = "tool-batch-completed";
export const USER_PROMPT_SUBMITTED = "user-prompt-submitted";

// Types of hook outputs
export const ADD_CONTEXT = "add-context"
export const BLOCK = "block"
