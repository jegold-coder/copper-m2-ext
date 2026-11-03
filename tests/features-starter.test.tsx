// The extension's fourth starter question: "What can Copper Notes do?", the
// one that makes Copper use its fifth tool, get_features.
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLive, type Live } from "@/lib/ai/live";
import type { Progress } from "@/lib/copper/assistant/progress";

const FEATURES_STARTER = "What can Copper Notes do?";
const COURSE_STARTERS = [
  "How much is Copper Home with Copper Plus, paid yearly, for 2 years?",
  "Is Copper Notes in Night Sky in stock?",
  "Is Copper Plus cheaper monthly or yearly?",
];

/** A finished answer, as the panel receives it from askCopper. */
function answered(reply: string): { progress: Live<Progress> } {
  const done = createLive<Progress>();
  done.done({ steps: [], reply, status: "done" });
  return { progress: done.live };
}

afterEach(() => {
  cleanup();
  vi.doUnmock("@/lib/copper/assistant/ask");
  vi.resetModules();
});

async function openPanel() {
  const askCopper = vi.fn().mockImplementation(async () => answered("Sure."));
  vi.doMock("@/lib/copper/assistant/ask", () => ({ askCopper }));
  vi.resetModules();
  const { AskCopper } = await import("@/components/copper/ask-copper");
  render(<AskCopper aiConfigured />);
  fireEvent.click(screen.getByTestId("ask-copper-launcher"));
  const panel = await screen.findByTestId("ask-copper");
  return { askCopper, chat: within(panel) };
}

describe("the features starter question", () => {
  it("is offered next to the three course starters", async () => {
    const { chat } = await openPanel();
    for (const starter of [...COURSE_STARTERS, FEATURES_STARTER]) {
      expect(chat.getByRole("button", { name: starter })).toBeInTheDocument();
    }
  });

  it("asks the question straight away when clicked", async () => {
    const { askCopper, chat } = await openPanel();
    fireEvent.click(chat.getByRole("button", { name: FEATURES_STARTER }));
    await waitFor(() => expect(askCopper).toHaveBeenCalledTimes(1));
    expect(askCopper.mock.calls[0][0]).toEqual({
      messages: [{ role: "user", content: FEATURES_STARTER }],
      useTools: true,
    });
  });
});
