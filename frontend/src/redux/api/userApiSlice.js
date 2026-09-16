import { apiSlice } from "./apiSlice";
import { USERS_URL } from "../constants";

export const userApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (payload) => ({
                url: `${USERS_URL}/login`,
                method: "POST",
                body: payload,
            }),
        }),
        register: builder.mutation({
            query: (formData) => ({
                url: `${USERS_URL}/register`,
                method: "POST",
                body: formData,
            }),
        }),
        logout: builder.mutation({
            query: () => ({
                url: `${USERS_URL}/logout`,
                method: "POST",
            }),
        }),
        updateAccountDetails: builder.mutation({
            query: (userData) => ({
                url: `${USERS_URL}/update-account`,
                method: "PUT",
                body: userData,
            }),
            invalidatesTags: ["User"],
        }),
        updateAvatar: builder.mutation({
            query: (formData) => ({
                url: `${USERS_URL}/update-avatar`,
                method: "PUT",
                body: formData,
            }),
            invalidatesTags: ["User"],
        }),
        updateCover: builder.mutation({
            query: (formData) => ({
                url: `${USERS_URL}/update-cover-image`,
                method: "PUT",
                body: formData,
            }),
            invalidatesTags: ["User"],
        }),
        changePassword: builder.mutation({
            query: (data) => ({
                url: `${USERS_URL}/change-password`,
                method: "POST",
                body: data,
            }),
        }),
        getUserProfile: builder.query({
            query: (username) => ({
                url: `${USERS_URL}/user/${username}`,
                method: "GET",
            }),
            providesTags: (result, error, arg) => [{ type: "User", id: arg }],
        }),
        getUserById: builder.query({
            query: (userId) => ({
                url: `${USERS_URL}/id/${userId}`,
                method: "GET",
            }),
            providesTags: (result, error, arg) => [{ type: "User", id: arg }],
        }),
        getAllUsers: builder.query({
            query: (search = "") => ({
                url: `${USERS_URL}/all-users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
                method: "GET",
            }),
            providesTags: ["User"],
        }),
    }),
});

export const {
    useLoginMutation,
    useRegisterMutation,
    useLogoutMutation,
    useUpdateAccountDetailsMutation,
    useUpdateAvatarMutation,
    useUpdateCoverMutation,
    useChangePasswordMutation,
    useGetUserProfileQuery,
    useGetUserByIdQuery,
    useGetAllUsersQuery,
} = userApiSlice;
