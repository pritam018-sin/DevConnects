import { apiSlice } from "./apiSlice";
import { POSTS_URL } from "../constants";

export const postApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getUserFeed: builder.query({
            query: ({ page = 1, limit = 20, sort = "trending" } = {}) => ({
                url: `${POSTS_URL}/feed?page=${page}&limit=${limit}&sort=${sort}`,
                method: "GET",
            }),
            providesTags: ["Post"],
        }),
        getPostsByUsername: builder.query({
            query: (username) => ({
                url: `${POSTS_URL}/${username}`,
                method: "GET",
            }),
            providesTags: ["Post"],
        }),
        getRepulsesByUsername: builder.query({
            query: (username) => ({
                url: `${POSTS_URL}/repulses/${username}`,
                method: "GET",
            }),
            providesTags: ["Post"],
        }),
        getUserAllPosts: builder.query({
            query: () => ({
                url: `${POSTS_URL}/user-profile/posts`,
                method: "GET",
            }),
            providesTags: ["Post"],
        }),
        getPostById: builder.query({
            query: (postId) => ({
                url: `${POSTS_URL}/post/${postId}`,
                method: "GET",
            }),
            providesTags: (result, error, arg) => [{ type: "Post", id: arg }],
        }),
        createPost: builder.mutation({
            query: (formData) => ({
                url: `${POSTS_URL}/post`,
                method: "POST",
                body: formData,
            }),
            invalidatesTags: ["Post"],
        }),
        editPost: builder.mutation({
            query: ({ postId, data }) => ({
                url: `${POSTS_URL}/post/${postId}`,
                method: "PUT",
                body: data,
            }),
            invalidatesTags: ["Post"],
        }),
        deletePost: builder.mutation({
            query: (postId) => ({
                url: `${POSTS_URL}/post/${postId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Post"],
        }),
        togglePinnedPost: builder.mutation({
            query: (postId) => ({
                url: `${POSTS_URL}/post/pin/${postId}`,
                method: "PATCH",
            }),
            invalidatesTags: ["Post"],
        }),
        repost: builder.mutation({
            query: (postId) => ({
                url: `${POSTS_URL}/post/repost/${postId}`,
                method: "POST",
            }),
            invalidatesTags: ["Post"],
        }),
    }),
});

export const {
    useGetUserFeedQuery,
    useGetPostsByUsernameQuery,
    useGetRepulsesByUsernameQuery,
    useGetUserAllPostsQuery,
    useGetPostByIdQuery,
    useCreatePostMutation,
    useEditPostMutation,
    useDeletePostMutation,
    useTogglePinnedPostMutation,
    useRepostMutation,
} = postApiSlice;
