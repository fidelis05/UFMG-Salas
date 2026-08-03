import type {
  ClientCorrection,
  CorrectionRequest,
} from "../../types/correction";

/** Returns the slot's updated state so callers can patch what they already have. */
export async function submitCorrection(
  correction: CorrectionRequest,
): Promise<ClientCorrection> {
  const res = await fetch("/api/corrections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(correction),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return (await res.json()) as ClientCorrection;
}
