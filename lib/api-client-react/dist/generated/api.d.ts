import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AdminConfig, AdminConfigUpdate, AdminUser, AiChatInput, AiMessage, AiModel, AiReply, Announcement, AnnouncementInput, AnnouncementUpdate, AuthResponse, BreadcrumbItem, ChangePasswordInput, DriveValidateInput, DriveValidateResult, ErrorResponse, FolderGeneratorInput, FolderGeneratorResult, FolderPreviewResult, GetAnnouncementsParams, GetLogsParams, GetRecentResourcesParams, GetSyncHistoryParams, HealthStatus, LoginInput, LogsResponse, NodeChildrenResponse, PdfUrlResponse, PublicConfig, ResourceItem, ResourceNode, ResourceStats, SearchPage, SearchParams, SuccessResponse, SyncJobResponse, SyncOptions, SyncRecord, SyncStatus } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getLoginUrl: () => string;
/**
 * @summary Admin login
 */
export declare const login: (loginInput: LoginInput, options?: RequestInit) => Promise<AuthResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginInput>;
export type LoginMutationError = ErrorType<ErrorResponse>;
/**
* @summary Admin login
*/
export declare const useLogin: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export declare const getLogoutUrl: () => string;
/**
 * @summary Admin logout
 */
export declare const logout: (options?: RequestInit) => Promise<SuccessResponse>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationError = ErrorType<unknown>;
/**
* @summary Admin logout
*/
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export declare const getChangePasswordUrl: () => string;
/**
 * @summary Change admin password
 */
export declare const changePassword: (changePasswordInput: ChangePasswordInput, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getChangePasswordMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof changePassword>>, TError, {
        data: BodyType<ChangePasswordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof changePassword>>, TError, {
    data: BodyType<ChangePasswordInput>;
}, TContext>;
export type ChangePasswordMutationResult = NonNullable<Awaited<ReturnType<typeof changePassword>>>;
export type ChangePasswordMutationBody = BodyType<ChangePasswordInput>;
export type ChangePasswordMutationError = ErrorType<ErrorResponse>;
/**
* @summary Change admin password
*/
export declare const useChangePassword: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof changePassword>>, TError, {
        data: BodyType<ChangePasswordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof changePassword>>, TError, {
    data: BodyType<ChangePasswordInput>;
}, TContext>;
export declare const getGetMeUrl: () => string;
/**
 * @summary Get current session info
 */
export declare const getMe: (options?: RequestInit) => Promise<AdminUser>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<unknown>;
/**
 * @summary Get current session info
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetConfigUrl: () => string;
/**
 * @summary Get all system configuration (public safe fields)
 */
export declare const getConfig: (options?: RequestInit) => Promise<PublicConfig>;
export declare const getGetConfigQueryKey: () => readonly ["/api/config"];
export declare const getGetConfigQueryOptions: <TData = Awaited<ReturnType<typeof getConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getConfig>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetConfigQueryResult = NonNullable<Awaited<ReturnType<typeof getConfig>>>;
export type GetConfigQueryError = ErrorType<unknown>;
/**
 * @summary Get all system configuration (public safe fields)
 */
export declare function useGetConfig<TData = Awaited<ReturnType<typeof getConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAdminConfigUrl: () => string;
/**
 * @summary Get full system configuration (admin only)
 */
export declare const getAdminConfig: (options?: RequestInit) => Promise<AdminConfig>;
export declare const getGetAdminConfigQueryKey: () => readonly ["/api/config/admin"];
export declare const getGetAdminConfigQueryOptions: <TData = Awaited<ReturnType<typeof getAdminConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdminConfig>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdminConfigQueryResult = NonNullable<Awaited<ReturnType<typeof getAdminConfig>>>;
export type GetAdminConfigQueryError = ErrorType<unknown>;
/**
 * @summary Get full system configuration (admin only)
 */
export declare function useGetAdminConfig<TData = Awaited<ReturnType<typeof getAdminConfig>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdminConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateAdminConfigUrl: () => string;
/**
 * @summary Update system configuration
 */
export declare const updateAdminConfig: (adminConfigUpdate: AdminConfigUpdate, options?: RequestInit) => Promise<AdminConfig>;
export declare const getUpdateAdminConfigMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAdminConfig>>, TError, {
        data: BodyType<AdminConfigUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAdminConfig>>, TError, {
    data: BodyType<AdminConfigUpdate>;
}, TContext>;
export type UpdateAdminConfigMutationResult = NonNullable<Awaited<ReturnType<typeof updateAdminConfig>>>;
export type UpdateAdminConfigMutationBody = BodyType<AdminConfigUpdate>;
export type UpdateAdminConfigMutationError = ErrorType<unknown>;
/**
* @summary Update system configuration
*/
export declare const useUpdateAdminConfig: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAdminConfig>>, TError, {
        data: BodyType<AdminConfigUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAdminConfig>>, TError, {
    data: BodyType<AdminConfigUpdate>;
}, TContext>;
export declare const getGetAnnouncementsUrl: (params?: GetAnnouncementsParams) => string;
/**
 * @summary List all announcements
 */
export declare const getAnnouncements: (params?: GetAnnouncementsParams, options?: RequestInit) => Promise<Announcement[]>;
export declare const getGetAnnouncementsQueryKey: (params?: GetAnnouncementsParams) => readonly ["/api/announcements", ...GetAnnouncementsParams[]];
export declare const getGetAnnouncementsQueryOptions: <TData = Awaited<ReturnType<typeof getAnnouncements>>, TError = ErrorType<unknown>>(params?: GetAnnouncementsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnnouncements>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnnouncements>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnnouncementsQueryResult = NonNullable<Awaited<ReturnType<typeof getAnnouncements>>>;
export type GetAnnouncementsQueryError = ErrorType<unknown>;
/**
 * @summary List all announcements
 */
export declare function useGetAnnouncements<TData = Awaited<ReturnType<typeof getAnnouncements>>, TError = ErrorType<unknown>>(params?: GetAnnouncementsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnnouncements>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAnnouncementUrl: () => string;
/**
 * @summary Create announcement
 */
export declare const createAnnouncement: (announcementInput: AnnouncementInput, options?: RequestInit) => Promise<Announcement>;
export declare const getCreateAnnouncementMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
        data: BodyType<AnnouncementInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
    data: BodyType<AnnouncementInput>;
}, TContext>;
export type CreateAnnouncementMutationResult = NonNullable<Awaited<ReturnType<typeof createAnnouncement>>>;
export type CreateAnnouncementMutationBody = BodyType<AnnouncementInput>;
export type CreateAnnouncementMutationError = ErrorType<unknown>;
/**
* @summary Create announcement
*/
export declare const useCreateAnnouncement: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
        data: BodyType<AnnouncementInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
    data: BodyType<AnnouncementInput>;
}, TContext>;
export declare const getGetAnnouncementUrl: (id: string) => string;
/**
 * @summary Get announcement by ID
 */
export declare const getAnnouncement: (id: string, options?: RequestInit) => Promise<Announcement>;
export declare const getGetAnnouncementQueryKey: (id: string) => readonly [`/api/announcements/${string}`];
export declare const getGetAnnouncementQueryOptions: <TData = Awaited<ReturnType<typeof getAnnouncement>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnnouncement>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnnouncement>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnnouncementQueryResult = NonNullable<Awaited<ReturnType<typeof getAnnouncement>>>;
export type GetAnnouncementQueryError = ErrorType<unknown>;
/**
 * @summary Get announcement by ID
 */
export declare function useGetAnnouncement<TData = Awaited<ReturnType<typeof getAnnouncement>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnnouncement>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateAnnouncementUrl: (id: string) => string;
/**
 * @summary Update announcement
 */
export declare const updateAnnouncement: (id: string, announcementUpdate: AnnouncementUpdate, options?: RequestInit) => Promise<Announcement>;
export declare const getUpdateAnnouncementMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAnnouncement>>, TError, {
        id: string;
        data: BodyType<AnnouncementUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAnnouncement>>, TError, {
    id: string;
    data: BodyType<AnnouncementUpdate>;
}, TContext>;
export type UpdateAnnouncementMutationResult = NonNullable<Awaited<ReturnType<typeof updateAnnouncement>>>;
export type UpdateAnnouncementMutationBody = BodyType<AnnouncementUpdate>;
export type UpdateAnnouncementMutationError = ErrorType<unknown>;
/**
* @summary Update announcement
*/
export declare const useUpdateAnnouncement: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAnnouncement>>, TError, {
        id: string;
        data: BodyType<AnnouncementUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAnnouncement>>, TError, {
    id: string;
    data: BodyType<AnnouncementUpdate>;
}, TContext>;
export declare const getDeleteAnnouncementUrl: (id: string) => string;
/**
 * @summary Delete announcement
 */
export declare const deleteAnnouncement: (id: string, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getDeleteAnnouncementMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAnnouncement>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAnnouncement>>, TError, {
    id: string;
}, TContext>;
export type DeleteAnnouncementMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAnnouncement>>>;
export type DeleteAnnouncementMutationError = ErrorType<unknown>;
/**
* @summary Delete announcement
*/
export declare const useDeleteAnnouncement: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAnnouncement>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAnnouncement>>, TError, {
    id: string;
}, TContext>;
export declare const getTriggerSyncUrl: () => string;
/**
 * @summary Trigger Google Drive synchronization
 */
export declare const triggerSync: (syncOptions?: SyncOptions, options?: RequestInit) => Promise<SyncJobResponse>;
export declare const getTriggerSyncMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerSync>>, TError, {
        data?: BodyType<SyncOptions>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof triggerSync>>, TError, {
    data?: BodyType<SyncOptions>;
}, TContext>;
export type TriggerSyncMutationResult = NonNullable<Awaited<ReturnType<typeof triggerSync>>>;
export type TriggerSyncMutationBody = BodyType<SyncOptions> | undefined;
export type TriggerSyncMutationError = ErrorType<unknown>;
/**
* @summary Trigger Google Drive synchronization
*/
export declare const useTriggerSync: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerSync>>, TError, {
        data?: BodyType<SyncOptions>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof triggerSync>>, TError, {
    data?: BodyType<SyncOptions>;
}, TContext>;
export declare const getGetSyncStatusUrl: () => string;
/**
 * @summary Get current sync status
 */
export declare const getSyncStatus: (options?: RequestInit) => Promise<SyncStatus>;
export declare const getGetSyncStatusQueryKey: () => readonly ["/api/drive/sync/status"];
export declare const getGetSyncStatusQueryOptions: <TData = Awaited<ReturnType<typeof getSyncStatus>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSyncStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSyncStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSyncStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getSyncStatus>>>;
export type GetSyncStatusQueryError = ErrorType<unknown>;
/**
 * @summary Get current sync status
 */
export declare function useGetSyncStatus<TData = Awaited<ReturnType<typeof getSyncStatus>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSyncStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetSyncHistoryUrl: (params?: GetSyncHistoryParams) => string;
/**
 * @summary Get sync history
 */
export declare const getSyncHistory: (params?: GetSyncHistoryParams, options?: RequestInit) => Promise<SyncRecord[]>;
export declare const getGetSyncHistoryQueryKey: (params?: GetSyncHistoryParams) => readonly ["/api/drive/sync/history", ...GetSyncHistoryParams[]];
export declare const getGetSyncHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getSyncHistory>>, TError = ErrorType<unknown>>(params?: GetSyncHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSyncHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSyncHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSyncHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getSyncHistory>>>;
export type GetSyncHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get sync history
 */
export declare function useGetSyncHistory<TData = Awaited<ReturnType<typeof getSyncHistory>>, TError = ErrorType<unknown>>(params?: GetSyncHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSyncHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getValidateDriveConfigUrl: () => string;
/**
 * @summary Validate Google Drive configuration
 */
export declare const validateDriveConfig: (driveValidateInput: DriveValidateInput, options?: RequestInit) => Promise<DriveValidateResult>;
export declare const getValidateDriveConfigMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof validateDriveConfig>>, TError, {
        data: BodyType<DriveValidateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof validateDriveConfig>>, TError, {
    data: BodyType<DriveValidateInput>;
}, TContext>;
export type ValidateDriveConfigMutationResult = NonNullable<Awaited<ReturnType<typeof validateDriveConfig>>>;
export type ValidateDriveConfigMutationBody = BodyType<DriveValidateInput>;
export type ValidateDriveConfigMutationError = ErrorType<unknown>;
/**
* @summary Validate Google Drive configuration
*/
export declare const useValidateDriveConfig: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof validateDriveConfig>>, TError, {
        data: BodyType<DriveValidateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof validateDriveConfig>>, TError, {
    data: BodyType<DriveValidateInput>;
}, TContext>;
export declare const getGetLevelsUrl: () => string;
/**
 * @summary Get all education levels
 */
export declare const getLevels: (options?: RequestInit) => Promise<ResourceNode[]>;
export declare const getGetLevelsQueryKey: () => readonly ["/api/resources/levels"];
export declare const getGetLevelsQueryOptions: <TData = Awaited<ReturnType<typeof getLevels>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLevels>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLevels>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLevelsQueryResult = NonNullable<Awaited<ReturnType<typeof getLevels>>>;
export type GetLevelsQueryError = ErrorType<unknown>;
/**
 * @summary Get all education levels
 */
export declare function useGetLevels<TData = Awaited<ReturnType<typeof getLevels>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLevels>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetResourceStatsUrl: () => string;
/**
 * @summary Get resource statistics
 */
export declare const getResourceStats: (options?: RequestInit) => Promise<ResourceStats>;
export declare const getGetResourceStatsQueryKey: () => readonly ["/api/resources/stats"];
export declare const getGetResourceStatsQueryOptions: <TData = Awaited<ReturnType<typeof getResourceStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getResourceStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getResourceStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetResourceStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getResourceStats>>>;
export type GetResourceStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get resource statistics
 */
export declare function useGetResourceStats<TData = Awaited<ReturnType<typeof getResourceStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getResourceStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetRecentResourcesUrl: (params?: GetRecentResourcesParams) => string;
/**
 * @summary Get recently added resources
 */
export declare const getRecentResources: (params?: GetRecentResourcesParams, options?: RequestInit) => Promise<ResourceItem[]>;
export declare const getGetRecentResourcesQueryKey: (params?: GetRecentResourcesParams) => readonly ["/api/resources/recent", ...GetRecentResourcesParams[]];
export declare const getGetRecentResourcesQueryOptions: <TData = Awaited<ReturnType<typeof getRecentResources>>, TError = ErrorType<unknown>>(params?: GetRecentResourcesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentResources>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentResources>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentResourcesQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentResources>>>;
export type GetRecentResourcesQueryError = ErrorType<unknown>;
/**
 * @summary Get recently added resources
 */
export declare function useGetRecentResources<TData = Awaited<ReturnType<typeof getRecentResources>>, TError = ErrorType<unknown>>(params?: GetRecentResourcesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentResources>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetNodeUrl: (nodeId: string) => string;
/**
 * @summary Get a specific resource node (folder or file)
 */
export declare const getNode: (nodeId: string, options?: RequestInit) => Promise<ResourceNode>;
export declare const getGetNodeQueryKey: (nodeId: string) => readonly [`/api/resources/nodes/${string}`];
export declare const getGetNodeQueryOptions: <TData = Awaited<ReturnType<typeof getNode>>, TError = ErrorType<ErrorResponse>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNode>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNode>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNodeQueryResult = NonNullable<Awaited<ReturnType<typeof getNode>>>;
export type GetNodeQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a specific resource node (folder or file)
 */
export declare function useGetNode<TData = Awaited<ReturnType<typeof getNode>>, TError = ErrorType<ErrorResponse>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNode>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListNodeChildrenUrl: (nodeId: string) => string;
/**
 * @summary Get children of a resource node
 */
export declare const listNodeChildren: (nodeId: string, options?: RequestInit) => Promise<NodeChildrenResponse>;
export declare const getListNodeChildrenQueryKey: (nodeId: string) => readonly [`/api/resources/nodes/${string}/children`];
export declare const getListNodeChildrenQueryOptions: <TData = Awaited<ReturnType<typeof listNodeChildren>>, TError = ErrorType<unknown>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNodeChildren>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listNodeChildren>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListNodeChildrenQueryResult = NonNullable<Awaited<ReturnType<typeof listNodeChildren>>>;
export type ListNodeChildrenQueryError = ErrorType<unknown>;
/**
 * @summary Get children of a resource node
 */
export declare function useListNodeChildren<TData = Awaited<ReturnType<typeof listNodeChildren>>, TError = ErrorType<unknown>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNodeChildren>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetNodeBreadcrumbUrl: (nodeId: string) => string;
/**
 * @summary Get breadcrumb path for a node
 */
export declare const getNodeBreadcrumb: (nodeId: string, options?: RequestInit) => Promise<BreadcrumbItem[]>;
export declare const getGetNodeBreadcrumbQueryKey: (nodeId: string) => readonly [`/api/resources/nodes/${string}/breadcrumb`];
export declare const getGetNodeBreadcrumbQueryOptions: <TData = Awaited<ReturnType<typeof getNodeBreadcrumb>>, TError = ErrorType<unknown>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNodeBreadcrumb>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNodeBreadcrumb>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNodeBreadcrumbQueryResult = NonNullable<Awaited<ReturnType<typeof getNodeBreadcrumb>>>;
export type GetNodeBreadcrumbQueryError = ErrorType<unknown>;
/**
 * @summary Get breadcrumb path for a node
 */
export declare function useGetNodeBreadcrumb<TData = Awaited<ReturnType<typeof getNodeBreadcrumb>>, TError = ErrorType<unknown>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNodeBreadcrumb>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetPdfUrlUrl: (nodeId: string) => string;
/**
 * @summary Get a signed/proxied URL for a PDF file
 */
export declare const getPdfUrl: (nodeId: string, options?: RequestInit) => Promise<PdfUrlResponse>;
export declare const getGetPdfUrlQueryKey: (nodeId: string) => readonly [`/api/resources/pdf/${string}/url`];
export declare const getGetPdfUrlQueryOptions: <TData = Awaited<ReturnType<typeof getPdfUrl>>, TError = ErrorType<unknown>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPdfUrl>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPdfUrl>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPdfUrlQueryResult = NonNullable<Awaited<ReturnType<typeof getPdfUrl>>>;
export type GetPdfUrlQueryError = ErrorType<unknown>;
/**
 * @summary Get a signed/proxied URL for a PDF file
 */
export declare function useGetPdfUrl<TData = Awaited<ReturnType<typeof getPdfUrl>>, TError = ErrorType<unknown>>(nodeId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPdfUrl>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSearchUrl: (params: SearchParams) => string;
/**
 * @summary Search resources
 */
export declare const search: (params: SearchParams, options?: RequestInit) => Promise<SearchPage>;
export declare const getSearchQueryKey: (params?: SearchParams) => readonly ["/api/search", ...SearchParams[]];
export declare const getSearchQueryOptions: <TData = Awaited<ReturnType<typeof search>>, TError = ErrorType<unknown>>(params: SearchParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof search>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof search>>, TError, TData> & {
    queryKey: QueryKey;
};
export type SearchQueryResult = NonNullable<Awaited<ReturnType<typeof search>>>;
export type SearchQueryError = ErrorType<unknown>;
/**
 * @summary Search resources
 */
export declare function useSearch<TData = Awaited<ReturnType<typeof search>>, TError = ErrorType<unknown>>(params: SearchParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof search>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAiChatUrl: () => string;
/**
 * @summary Send a message to the AI
 */
export declare const aiChat: (aiChatInput: AiChatInput, options?: RequestInit) => Promise<AiReply>;
export declare const getAiChatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof aiChat>>, TError, {
        data: BodyType<AiChatInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof aiChat>>, TError, {
    data: BodyType<AiChatInput>;
}, TContext>;
export type AiChatMutationResult = NonNullable<Awaited<ReturnType<typeof aiChat>>>;
export type AiChatMutationBody = BodyType<AiChatInput>;
export type AiChatMutationError = ErrorType<unknown>;
/**
* @summary Send a message to the AI
*/
export declare const useAiChat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof aiChat>>, TError, {
        data: BodyType<AiChatInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof aiChat>>, TError, {
    data: BodyType<AiChatInput>;
}, TContext>;
export declare const getGetAiMessagesUrl: (sessionId: string) => string;
/**
 * @summary Get messages in a session
 */
export declare const getAiMessages: (sessionId: string, options?: RequestInit) => Promise<AiMessage[]>;
export declare const getGetAiMessagesQueryKey: (sessionId: string) => readonly [`/api/ai/sessions/${string}/messages`];
export declare const getGetAiMessagesQueryOptions: <TData = Awaited<ReturnType<typeof getAiMessages>>, TError = ErrorType<unknown>>(sessionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAiMessages>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAiMessagesQueryResult = NonNullable<Awaited<ReturnType<typeof getAiMessages>>>;
export type GetAiMessagesQueryError = ErrorType<unknown>;
/**
 * @summary Get messages in a session
 */
export declare function useGetAiMessages<TData = Awaited<ReturnType<typeof getAiMessages>>, TError = ErrorType<unknown>>(sessionId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiMessages>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getClearAiSessionUrl: (sessionId: string) => string;
/**
 * @summary Clear a chat session
 */
export declare const clearAiSession: (sessionId: string, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getClearAiSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearAiSession>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof clearAiSession>>, TError, {
    sessionId: string;
}, TContext>;
export type ClearAiSessionMutationResult = NonNullable<Awaited<ReturnType<typeof clearAiSession>>>;
export type ClearAiSessionMutationError = ErrorType<unknown>;
/**
* @summary Clear a chat session
*/
export declare const useClearAiSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearAiSession>>, TError, {
        sessionId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof clearAiSession>>, TError, {
    sessionId: string;
}, TContext>;
export declare const getGetAiModelsUrl: () => string;
/**
 * @summary Get available AI models
 */
export declare const getAiModels: (options?: RequestInit) => Promise<AiModel[]>;
export declare const getGetAiModelsQueryKey: () => readonly ["/api/ai/models"];
export declare const getGetAiModelsQueryOptions: <TData = Awaited<ReturnType<typeof getAiModels>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiModels>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAiModels>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAiModelsQueryResult = NonNullable<Awaited<ReturnType<typeof getAiModels>>>;
export type GetAiModelsQueryError = ErrorType<unknown>;
/**
 * @summary Get available AI models
 */
export declare function useGetAiModels<TData = Awaited<ReturnType<typeof getAiModels>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiModels>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGenerateFoldersUrl: () => string;
/**
 * @summary Generate folder structure in Google Drive
 */
export declare const generateFolders: (folderGeneratorInput: FolderGeneratorInput, options?: RequestInit) => Promise<FolderGeneratorResult>;
export declare const getGenerateFoldersMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateFolders>>, TError, {
        data: BodyType<FolderGeneratorInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateFolders>>, TError, {
    data: BodyType<FolderGeneratorInput>;
}, TContext>;
export type GenerateFoldersMutationResult = NonNullable<Awaited<ReturnType<typeof generateFolders>>>;
export type GenerateFoldersMutationBody = BodyType<FolderGeneratorInput>;
export type GenerateFoldersMutationError = ErrorType<unknown>;
/**
* @summary Generate folder structure in Google Drive
*/
export declare const useGenerateFolders: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateFolders>>, TError, {
        data: BodyType<FolderGeneratorInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateFolders>>, TError, {
    data: BodyType<FolderGeneratorInput>;
}, TContext>;
export declare const getPreviewFoldersUrl: () => string;
/**
 * @summary Preview folder structure before generation
 */
export declare const previewFolders: (folderGeneratorInput: FolderGeneratorInput, options?: RequestInit) => Promise<FolderPreviewResult>;
export declare const getPreviewFoldersMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewFolders>>, TError, {
        data: BodyType<FolderGeneratorInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof previewFolders>>, TError, {
    data: BodyType<FolderGeneratorInput>;
}, TContext>;
export type PreviewFoldersMutationResult = NonNullable<Awaited<ReturnType<typeof previewFolders>>>;
export type PreviewFoldersMutationBody = BodyType<FolderGeneratorInput>;
export type PreviewFoldersMutationError = ErrorType<unknown>;
/**
* @summary Preview folder structure before generation
*/
export declare const usePreviewFolders: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewFolders>>, TError, {
        data: BodyType<FolderGeneratorInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof previewFolders>>, TError, {
    data: BodyType<FolderGeneratorInput>;
}, TContext>;
export declare const getGetLogsUrl: (params?: GetLogsParams) => string;
/**
 * @summary Get system logs
 */
export declare const getLogs: (params?: GetLogsParams, options?: RequestInit) => Promise<LogsResponse>;
export declare const getGetLogsQueryKey: (params?: GetLogsParams) => readonly ["/api/logs", ...GetLogsParams[]];
export declare const getGetLogsQueryOptions: <TData = Awaited<ReturnType<typeof getLogs>>, TError = ErrorType<unknown>>(params?: GetLogsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLogs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLogsQueryResult = NonNullable<Awaited<ReturnType<typeof getLogs>>>;
export type GetLogsQueryError = ErrorType<unknown>;
/**
 * @summary Get system logs
 */
export declare function useGetLogs<TData = Awaited<ReturnType<typeof getLogs>>, TError = ErrorType<unknown>>(params?: GetLogsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getClearLogsUrl: () => string;
/**
 * @summary Clear system logs
 */
export declare const clearLogs: (options?: RequestInit) => Promise<SuccessResponse>;
export declare const getClearLogsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearLogs>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof clearLogs>>, TError, void, TContext>;
export type ClearLogsMutationResult = NonNullable<Awaited<ReturnType<typeof clearLogs>>>;
export type ClearLogsMutationError = ErrorType<unknown>;
/**
* @summary Clear system logs
*/
export declare const useClearLogs: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearLogs>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof clearLogs>>, TError, void, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map