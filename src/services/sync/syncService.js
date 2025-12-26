import {
  bumpOutboxAttempt,
  getPendingOutboxEvents,
  markOutboxEventRejected,
  markOutboxEventSent,
} from "../database/outbox";
import { createApiClient } from "./apiClient";
import { applyPullData } from "./applyPull";
import {
  getLastPullSince,
  getOrCreateDeviceId,
  setLastPullSince,
} from "./syncState";

export const pushOutbox = async ({ baseUrl, token, limit = 50 }) => {
  const deviceId = await getOrCreateDeviceId();
  const pending = await getPendingOutboxEvents(limit);

  if (pending.length === 0) {
    return { sent: 0, rejected: 0, attempted: 0 };
  }

  const api = createApiClient({ baseUrl, token });

  const events = pending.map((evt) => ({
    eventId: evt.eventId,
    type: evt.type,
    entityId: evt.entityId,
    payload: evt.payload,
  }));

  try {
    const resp = await api.post("/api/sync/push", { deviceId, events });

    const acked = resp?.data?.data?.acked || [];
    const rejected = resp?.data?.data?.rejected || [];

    for (const eventId of acked) {
      await markOutboxEventSent(eventId);
    }

    for (const rej of rejected) {
      await markOutboxEventRejected(rej.eventId, rej.reason);
    }

    return {
      sent: acked.length,
      rejected: rejected.length,
      attempted: pending.length,
    };
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || "push failed";

    for (const evt of pending) {
      await bumpOutboxAttempt(evt.eventId, message);
    }

    throw error;
  }
};

export const pullAndApply = async ({ baseUrl, token }) => {
  const api = createApiClient({ baseUrl, token });
  const since = await getLastPullSince();

  const resp = await api.get("/api/sync/pull", { params: { since } });
  const data = resp?.data?.data;

  if (!data) {
    throw new Error("Invalid sync pull response");
  }

  const applied = await applyPullData(data);

  if (data.nextSince) {
    await setLastPullSince(data.nextSince);
  }

  return { since, nextSince: data.nextSince, ...applied };
};

export const syncNow = async ({ baseUrl, token, pushLimit = 50 }) => {
  const pushResult = await pushOutbox({ baseUrl, token, limit: pushLimit });
  const pullResult = await pullAndApply({ baseUrl, token });
  return { push: pushResult, pull: pullResult };
};

export default {
  pushOutbox,
  pullAndApply,
  syncNow,
};
