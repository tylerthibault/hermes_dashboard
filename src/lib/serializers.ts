import { AgentEvent } from "@prisma/client";
import { toUiEventType } from "@/lib/eventTypes";

export function serializeDates<T extends Record<string, unknown>>(value: T) {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = val instanceof Date ? val.toISOString() : val;
  }
  return out as T;
}

export function serializeEvent(event: AgentEvent) {
  return {
    ...serializeDates(event),
    type: toUiEventType(event.type),
  };
}
