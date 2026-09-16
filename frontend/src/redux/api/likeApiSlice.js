import { apiSlice } from "./apiSlice";
import { LIKES_URL } from "../constants";

export const likeApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        toggleLike: builder.mutation({
            query: ({ parentId, parentType }) => ({
                url: `${LIKES_URL}/toggle-like`,
                method: "POST",
                body: { parentId, parentType },
            }),
            invalidatesTags: (result, error, { parentId, parentType }) => [
                { type: parentType, id: parentId },
                parentType,
                "Like",
            ],
        }),
        getLikes: builder.query({
            query: ({ parentId, parentType }) => ({
                url: `${LIKES_URL}/get-like?parentId=${parentId}&parentType=${parentType}`,
                method: "GET",
            }),
            providesTags: (result, error, { parentId }) => [{ type: "Like", id: parentId }],
        }),
    }),
});

export const {
    useToggleLikeMutation,
    useGetLikesQuery,
} = likeApiSlice;
