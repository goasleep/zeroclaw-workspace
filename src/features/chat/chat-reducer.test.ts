import { describe, expect, it } from "vitest";
import { chatReducer, mergeTranscripts, normalizeSession } from "./chat-reducer";
import type { ChatState } from "./chat-reducer";
import type { ChatMessage } from "./chat-types";

describe("chatReducer", () => {
  it("adds a user message and pending assistant placeholder before sending", () => {
    const state: ChatState = { messages: [], sessionId: null };
    const next = chatReducer(state, {
      type: "push-user",
      content: "hello",
      attachments: [{ filename: "a.txt", mime_type: "text/plain", size: 12 }],
    });

    expect(next.messages).toHaveLength(2);
    expect(next.messages[0]).toMatchObject({
      role: "user",
      content: "hello",
      attachments: [{ filename: "a.txt", mime_type: "text/plain", size: 12 }],
      status: "done",
    });
    expect(next.messages[1]).toMatchObject({ role: "assistant", content: "", status: "pending" });
  });

  it("streams chunks into the latest assistant message", () => {
    const state = chatReducer({ messages: [], sessionId: null }, { type: "push-user", content: "hi" });
    const next = chatReducer(state, { type: "frame", frame: { type: "chunk", content: "there" } });

    expect(next.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "there",
      status: "streaming",
    });
  });
});

describe("session helpers", () => {
  it("normalizes sessions using fallback ids and names", () => {
    expect(
      normalizeSession({
        id: "abcdef123456",
        name: "",
        agent_alias: "agent",
      }),
    ).toMatchObject({
      session_id: "abcdef123456",
      name: "session abcdef12",
      agent_alias: "agent",
    });
  });

  it("merges cached transcript entries that are missing from gateway history", () => {
    const gateway: ChatMessage[] = [
      { id: "1", role: "user", content: "hello", toolCalls: [], status: "done" },
    ];
    const cached: ChatMessage[] = [
      { id: "2", role: "assistant", content: "cached", toolCalls: [], status: "done" },
    ];

    expect(mergeTranscripts(gateway, cached).map((message) => message.content)).toEqual([
      "hello",
      "cached",
    ]);
  });
});
