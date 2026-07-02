import axios from "axios";
import { useAuthStore } from "../auth/store";

/** Envelope chuẩn của FTES-AOS-Backend: data luôn nullable. */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T | null;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // TODO (admin-foundation): refresh-token flow trước khi clear
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  }
);
