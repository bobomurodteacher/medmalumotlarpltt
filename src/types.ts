export interface MedicalWorkerSubmission {
  id: string;
  fullName: string;
  position: string;
  workplace: string;
  phoneNumber?: string;
  passport: string; // e.g. "AA 1234567"
  jshshir: string;  // 14 digits
  createdAt: string;
}

export interface AppConfig {
  adminPassword: string;
  positions: string[];
  workplaces: string[];
}
