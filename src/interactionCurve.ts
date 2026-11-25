/** A cubic scalar transition whose two final control values coincide. */
export function interactionCurve(start:number, lead:number, end:number, u:number) {
  const remaining=1-u;
  return remaining**3*start+3*remaining**2*u*lead+u*u*(3-2*u)*end;
}

/** Derivative with respect to the normalized curve parameter. */
export function interactionCurveTangent(start:number, lead:number, end:number, u:number) {
  const remaining=1-u;
  return 3*remaining*(remaining*(lead-start)+2*u*(end-lead));
}
