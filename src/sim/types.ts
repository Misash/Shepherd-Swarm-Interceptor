export type Role = "STRIKER" | "SHEPHERD";
export type Phase = "ASCEND" | "CHASE" | "FOLLOW" | "FORM" | "ENGAGE";

export const PHASE_COLORS: Record<Phase, string> = {
  ASCEND: "#3498db",
  CHASE: "#e67e22",
  FOLLOW: "#f1c40f",
  FORM: "#9b59b6",
  ENGAGE: "#e74c3c",
};
