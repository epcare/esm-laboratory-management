import { openmrsFetch, restBaseUrl } from "@openmrs/esm-framework";

// UgandaEMR-style sync API functions
// These use the ugandaemrsync module endpoints

export async function syncAllTestOrdersUganda() {
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

export async function syncSelectedTestOrdersUganda(orders: string[]) {
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

export async function syncAllTestOrderResultsUganda() {
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

export async function syncSelectedTestOrderResultsUganda(orders: string[]) {
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
