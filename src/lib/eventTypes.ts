import { AgentEventType } from "@prisma/client";
import { AgentEvent as UiAgentEvent } from "@/types/hermes";

const toDbTypeMap: Record<UiAgentEvent["type"], AgentEventType> = {
  "user.message": "user_message",
  "agent.message.delta": "agent_message_delta",
  "agent.message.done": "agent_message_done",
  "tool.started": "tool_started",
  "tool.output": "tool_output",
  "tool.error": "tool_error",
  "file.read": "file_read",
  "file.changed": "file_changed",
  "command.started": "command_started",
  "command.completed": "command_completed",
  "approval.required": "approval_required",
  "approval.approved": "approval_approved",
  "approval.rejected": "approval_rejected",
  "run.paused": "run_paused",
  "run.stopped": "run_stopped",
  "run.completed": "run_completed",
  "run.failed": "run_failed",
};

const toUiTypeMap: Record<AgentEventType, UiAgentEvent["type"]> = {
  user_message: "user.message",
  agent_message_delta: "agent.message.delta",
  agent_message_done: "agent.message.done",
  tool_started: "tool.started",
  tool_output: "tool.output",
  tool_error: "tool.error",
  file_read: "file.read",
  file_changed: "file.changed",
  command_started: "command.started",
  command_completed: "command.completed",
  approval_required: "approval.required",
  approval_approved: "approval.approved",
  approval_rejected: "approval.rejected",
  run_paused: "run.paused",
  run_stopped: "run.stopped",
  run_completed: "run.completed",
  run_failed: "run.failed",
};

export function toDbEventType(type: UiAgentEvent["type"]) {
  return toDbTypeMap[type];
}

export function toUiEventType(type: AgentEventType) {
  return toUiTypeMap[type];
}
