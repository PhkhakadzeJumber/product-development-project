import { get, post, patch, del } from "@/lib/api-client";
import type { Appointment, AppointmentDetail, DoctorPublic, DoctorReviews, DoctorReview, Drug, Hospital, Prescription, Slot, Specialization, Token, TreatmentCase, Message } from "@/types/api";

export const AuthApi = {
  login: (email: string, password: string) => post<Token>("/auth/login", { email, password }),
  registerPatient: (b: Record<string, unknown>) => post<Token>("/auth/register/patient", b),
  registerDoctor: (b: Record<string, unknown>) => post<Token>("/auth/register/doctor", b),
  registerAdmin: (b: Record<string, unknown>) => post<Token>("/auth/register/admin", b),
  myProfile: () => get<{ avatar_url?: string | null; photo_url?: string | null }>("/auth/me/profile"),
  updateProfile: (b: Record<string, unknown>) => patch<{ avatar_url?: string | null; photo_url?: string | null }>("/auth/me/profile", b),
};
export const CatalogApi = {
  hospitals: (region_id?: number) => get<Hospital[]>(`/hospitals${region_id ? `?region_id=${region_id}` : ""}`),
  specializations: () => get<Specialization[]>("/specializations"),
  drugs: (search?: string) => get<Drug[]>(`/drugs${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  drug: (id: number) => get<Drug>(`/drugs/${id}`),
  updateDrugImage: (id: number, image_url: string | null) => patch<Drug>(`/drugs/${id}`, { image_url }),
};
export const DoctorApi = {
  list: (hospital_id?: number, specialization_id?: number) => {
    const q = new URLSearchParams();
    if (hospital_id) q.set("hospital_id", String(hospital_id));
    if (specialization_id) q.set("specialization_id", String(specialization_id));
    const s = q.toString();
    return get<DoctorPublic[]>(`/doctors${s ? `?${s}` : ""}`);
  },
  get: (id: number) => get<DoctorPublic>(`/doctors/${id}`),
  reviews: (id: number) => get<DoctorReviews>(`/doctors/${id}/reviews`),
  performance: (id: number) => get<Record<string, unknown>>(`/doctors/${id}/performance`),
};
export const SlotApi = {
  list: (doctor_id?: number, status?: string, futureOnly?: boolean) => {
    const q = new URLSearchParams();
    if (doctor_id) q.set("doctor_id", String(doctor_id));
    if (status) q.set("status", status);
    if (futureOnly) q.set("future_only", "true");
    const s = q.toString();
    return get<Slot[]>(`/slots${s ? `?${s}` : ""}`);
  },
  create: (b: Record<string, unknown>) => post<Slot>("/slots", b),
  remove: (id: number) => del<{ ok: boolean }>(`/slots/${id}`),
};
export const AppointmentApi = {
  mine: () => get<Appointment[]>("/appointments/mine"),
  get: (id: number) => get<AppointmentDetail>(`/appointments/${id}`),
  book: (slot_id: number, reason?: string) => post<Appointment>("/appointments", { slot_id, reason }),
  cancel: (id: number, cancel_reason?: string) => post<Appointment>(`/appointments/${id}/cancel`, { cancel_reason }),
  setStatus: (id: number, status: string) => patch<Appointment>(`/appointments/${id}/status?status=${status}`),
};
export const ClinicalApi = {
  createCase: (b: Record<string, unknown>) => post<TreatmentCase>("/treatment-cases", b),
  cases: (patient_id?: number) => get<TreatmentCase[]>(`/treatment-cases${patient_id ? `?patient_id=${patient_id}` : ""}`),
  timeline: (id: number) => get<{ case: Record<string, unknown>; consultations: Record<string, unknown>[] }>(`/treatment-cases/${id}/timeline`),
  createConsultation: (b: Record<string, unknown>) => post<{ consultation_id: number }>("/consultations", b),
  createPrescription: (b: Record<string, unknown>) => post<Prescription>("/prescriptions", b),
  myPrescriptions: () => get<Prescription[]>("/prescriptions/mine"),
  completePrescription: (id: number) => patch<{ ok: boolean }>(`/prescriptions/${id}/complete`),
};
export const FeedbackChatApi = {
  review: (appointment_id: number, rating: number, comment?: string) => post<{ review_id: number }>("/reviews", { appointment_id, rating, comment: comment || null }),
  myReview: (appointment_id: number) => get<DoctorReview | null>(`/reviews?appointment_id=${appointment_id}`),
  conversation: (patient_id: number, doctor_id: number) => post<{ conversation_id: number }>(`/conversations?patient_id=${patient_id}&doctor_id=${doctor_id}`),
  messages: (id: number) => get<Message[]>(`/conversations/${id}/messages`),
  send: (id: number, body?: string, message_type = "TEXT") => post<{ message_id: number }>(`/conversations/${id}/messages`, { body, message_type }),
};
