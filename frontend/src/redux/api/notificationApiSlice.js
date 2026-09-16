import { apiSlice } from "./apiSlice";
import { NOTIFICATIONS_URL } from "../constants";

export const notificationApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getUserNotifications: builder.query({
            query: ({ page = 1, limit = 20 } = {}) => ({
                url: `${NOTIFICATIONS_URL}?page=${page}&limit=${limit}`,
                method: "GET",
            }),
            providesTags: ["Notification"],
        }),
        markNotificationAsRead: builder.mutation({
            query: (notificationId) => ({
                url: `${NOTIFICATIONS_URL}/${notificationId}/read`,
                method: "PATCH",
            }),
            invalidatesTags: ["Notification"],
        }),
        deleteNotification: builder.mutation({
            query: (notificationId) => ({
                url: `${NOTIFICATIONS_URL}/${notificationId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Notification"],
        }),
    }),
});

export const {
    useGetUserNotificationsQuery,
    useMarkNotificationAsReadMutation,
    useDeleteNotificationMutation,
} = notificationApiSlice;
