import { apiSlice } from "./apiSlice";
import { FOLLOWS_URL } from "../constants";

export const followApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        toggleFollow: builder.mutation({
            query: (targetUserId) => ({
                url: `${FOLLOWS_URL}/toggle-follow/${targetUserId}`,
                method: "POST",
            }),
            invalidatesTags: ["Follow", "User", "Post"],
        }),
        getFollowers: builder.query({
            query: (userId) => ({
                url: `${FOLLOWS_URL}/followers/${userId}`,
                method: "GET",
            }),
            providesTags: (result, error, userId) => [{ type: "Follow", id: `followers-${userId}` }],
        }),
        getFollowing: builder.query({
            query: (userId) => ({
                url: `${FOLLOWS_URL}/following/${userId}`,
                method: "GET",
            }),
            providesTags: (result, error, userId) => [{ type: "Follow", id: `following-${userId}` }],
        }),
        removeFollower: builder.mutation({
            query: (userId) => ({
                url: `${FOLLOWS_URL}/remove-follower/${userId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Follow", "User"],
        }),
    }),
});

export const {
    useToggleFollowMutation,
    useGetFollowersQuery,
    useGetFollowingQuery,
    useRemoveFollowerMutation,
} = followApiSlice;
