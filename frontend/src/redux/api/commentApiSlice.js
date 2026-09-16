import { apiSlice } from "./apiSlice";
import { COMMENTS_URL } from "../constants";

export const commentApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getComments: builder.query({
            query: ({ parentId, parentType }) => ({
                url: `${COMMENTS_URL}/post-comment?parentId=${parentId}&parentType=${parentType}`,
                method: "GET",
            }),
            providesTags: (result, error, { parentId }) => [{ type: "Comment", id: parentId }],
        }),
        createComment: builder.mutation({
            query: (data) => ({
                url: `${COMMENTS_URL}/create-comment`,
                method: "POST",
                body: data,
            }),
            invalidatesTags: (result, error, { parentId }) => [
                { type: "Comment", id: parentId },
                "Post",
                "Project",
            ],
        }),
        replyToComment: builder.mutation({
            query: ({ commentId, content, parentId }) => ({
                url: `${COMMENTS_URL}/${commentId}/reply`,
                method: "POST",
                body: { content },
            }),
            invalidatesTags: (result, error, { parentId }) => [
                { type: "Comment", id: parentId },
            ],
        }),
        toggleCommentLike: builder.mutation({
            query: ({ commentId, parentId }) => ({
                url: `${COMMENTS_URL}/${commentId}/like`,
                method: "POST",
            }),
            invalidatesTags: (result, error, { parentId }) => [
                { type: "Comment", id: parentId },
            ],
        }),
        deleteComment: builder.mutation({
            query: ({ commentId, parentId }) => ({
                url: `${COMMENTS_URL}/${commentId}/delete`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, { parentId }) => [
                { type: "Comment", id: parentId },
                "Post",
                "Project",
            ],
        }),
    }),
});

export const {
    useGetCommentsQuery,
    useCreateCommentMutation,
    useReplyToCommentMutation,
    useToggleCommentLikeMutation,
    useDeleteCommentMutation,
} = commentApiSlice;
