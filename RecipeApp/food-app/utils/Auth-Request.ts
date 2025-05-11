import axios, { AxiosRequestConfig, AxiosError, AxiosHeaders } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { BASE_URL } from "./api";
// import { router } from "expo-router";

// declare module 'axios' {
//     interface AxiosRequestConfig {
//         authRequired?: boolean;
//     }
//     interface InternalAxiosRequestConfig {
//         authRequired?: boolean;
//       }
    
// }


// 1. Custom Error Types ==============================================
export class AuthenticationError extends Error {
    constructor(message = "Session expired. Please login again.") {
        super(message);
        this.name = "AuthenticationError";
    }
}

export class NetworkError extends Error {
    constructor(message = "Network unavailable. Please check your connection.") {
        super(message);
        this.name = "NetworkError";
    }
}

// Initialize network listener

// 3. Token Management ================================================
export const tokenOperation = {
    getAccessToken: async () => Platform.OS === "web"
        ? localStorage.getItem("access_token")
        : await SecureStore.getItemAsync("access_token"),

    getRefreshToken: async () => Platform.OS === "web"
        ? localStorage.getItem("refresh_token")
        : await SecureStore.getItemAsync("refresh_token"),

    setAccessToken: async (token: string) => {
        if (Platform.OS === "web") {
            localStorage.setItem("access_token", token);
        } else {
            await SecureStore.setItemAsync("access_token", token);
        }
    },

    clearTokens: async () => {
        if (Platform.OS === "web") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
        } else {
            await SecureStore.deleteItemAsync("access_token");
            await SecureStore.deleteItemAsync("refresh_token");
        }
    }
};

// 4. Auth Functions ==================================================
const logout = async () => {
    await tokenOperation.clearTokens();
    // router.replace("/(tabs)/account");
};

const refreshAccessToken = async (): Promise<string> => {

    const refreshToken = await tokenOperation.getRefreshToken();
    
    if (!refreshToken) throw new AuthenticationError();

    try {
        const response = await axios.post(
            `${BASE_URL}/api/token/refresh/`,
            { refresh: refreshToken },
            { headers: { "Content-Type": "application/json" } },    
        );

        const newAccessToken = response.data.access;
        await tokenOperation.setAccessToken(newAccessToken);
        return newAccessToken;
    } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 401) {
            await logout();
            throw new AuthenticationError();
        }

        if (!axiosError.response) {
            throw new NetworkError();
        }

        throw error; // Re-throw other errors
    }
};

// 5. Axios Configuration =============================================
const api = axios.create({ baseURL: BASE_URL });

// Request Interceptor
api.interceptors.request.use(
    async (config) => {

        // Add auth header if required

        const AccessToken = await tokenOperation.getAccessToken();
        if (AccessToken) {
            config.headers = config.headers ?? new AxiosHeaders();
            config.headers.Authorization = `Bearer ${AccessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)

);

// Response Interceptor
api.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Network errors
        if (!error.response) throw new NetworkError();
        // Handle token expiration
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const newToken = await refreshAccessToken();
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                if (refreshError instanceof AuthenticationError) {
                    await logout();
                }
                throw refreshError;
            }
        }

        return Promise.reject(error);
    }
);

export const isLoggedIn = async (): Promise<boolean> => {
    const accessToken = await tokenOperation.getAccessToken();
    return !!accessToken;
};

export const apiClient = {
    get: (url: string, params: Record<string, any> = {}) =>
        api.get(url, {
            params,
            headers: {
                "ngrok-skip-browser-warning": "69420",
            },
        } as AxiosRequestConfig),

    post: <T>(url: string, data: T) =>
        api.post(url, data, {
            headers: {
                "ngrok-skip-browser-warning": "69420",
            },
        } as AxiosRequestConfig),

    put: (url: string, data: Record<string, any>) =>
        api.put(url, data, {
            headers: {
                "ngrok-skip-browser-warning": "69420",
            },
        } as AxiosRequestConfig),

    delete: (url: string) =>
        api.delete(url, {
            headers: {
                "ngrok-skip-browser-warning": "69420",
            },
        } as AxiosRequestConfig),

    patch: (url: string, data: Record<string, any>) =>
        api.patch(url, data, {
            headers: {
                "ngrok-skip-browser-warning": "69420",
            },
        } as AxiosRequestConfig),

    upload: (url: string, formData: FormData) =>
        api.post(url, formData, {
            headers: { 
                "Content-Type": "multipart/form-data",
                "ngrok-skip-browser-warning": "69420",
             },
        } as AxiosRequestConfig)
};
