import { restBaseUrl, openmrsFetch } from "@openmrs/esm-framework";

export async function syncAllTestOrders() {
  const apiUrl = `${restBaseUrl}/taskaction`;
  const payload = JSON.stringify({
    action: "RUNTASK",
    tasks: ["Send Viral Load Request to Central Server Task"],
  });
  const abortController = new AbortController();
  return await openmrsFetch(apiUrl, {
    method: "POST",
    signal: abortController.signal,
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}

export async function syncSelectedTestOrders(orders: string[]) {
  const apiUrl = `${restBaseUrl}/syncTestOrder`;
  const payload = JSON.stringify({ orders: orders });
  const abortController = new AbortController();
  return await openmrsFetch(apiUrl, {
    method: "POST",
    signal: abortController.signal,
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}

export async function syncAllTestOrderResults() {
  const apiUrl = `${restBaseUrl}/taskaction`;
  const payload = JSON.stringify({
    action: "RUNTASK",
    tasks: ["Request Viral Results"],
  });
  const abortController = new AbortController();
  return await openmrsFetch(apiUrl, {
    method: "POST",
    signal: abortController.signal,
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}

export async function syncSelectedTestOrderResults(orders: string[]) {
  const apiUrl = `${restBaseUrl}/requestlabresult`;
  const payload = JSON.stringify({ orders: orders });
  const abortController = new AbortController();
  return await openmrsFetch(apiUrl, {
    method: "POST",
    signal: abortController.signal,
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}
