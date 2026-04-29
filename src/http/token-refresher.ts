import { deleteCredentials, readCredentials, writeCredentials } from '../auth/credentials';
import { NetworkError } from '../errors';
import { apiRequest, type ApiRequestOptions, type ApiResponse } from './client';

interface RefreshResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number; // in seconds
}

export async function refreshAndRetry<T>(originalOptions: ApiRequestOptions): Promise<ApiResponse<T>> {
    const creds = readCredentials();

    if (!creds) {
        console.error('Session expired. Run `insighta login` to re-authenticate.' );
        process.exit(1);
    }

    // Attempt to refresh token
    let refreshResponse: ApiResponse<RefreshResponse>;

    try {
        refreshResponse = await apiRequest<RefreshResponse>({
            method: 'POST',
            path: '/auth/refresh',
            body: { refresh_token: creds.refreshToken },
            accessToken: creds.accessToken, // still needed for the request wrapper
            operation: 'token refresh',
        });
    } catch (err) {
        if (err instanceof NetworkError) {
            console.error(err.message);
            process.exit(1);
        }
        throw err;
    }

    // 400 or 401 from the refresh endpoint -> session is dead
    if (refreshResponse.status === 400 || refreshResponse.status === 401) {
        deleteCredentials();
        console.error('Session expired. Run `insighta login` to re-authenticate.');
        process.exit(1);
    }

    // Update credentials store with new tokens
    const { access_token, refresh_token, expires_in } = refreshResponse.data;
    writeCredentials({
        ...creds,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + expires_in * 1000,
    });

    // Retry the original request exactly once with the new token
    return apiRequest<T>({
        ...originalOptions,
        accessToken: access_token
    });
}