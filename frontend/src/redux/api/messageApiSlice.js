import { apiSlice } from "./apiSlice";
import { MESSAGES_URL } from "../constants";

export const messageApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getConversations: builder.query({
            query: () => ({
                url: `${MESSAGES_URL}/conversations`,
                method: "GET",
            }),
            providesTags: ["Message"],
        }),
        getMessages: builder.query({
            query: (receiverId) => ({
                url: `${MESSAGES_URL}/${receiverId}`,
                method: "GET",
            }),
            providesTags: (result, error, receiverId) => [{ type: "Message", id: receiverId }],
        }),
        sendMessage: builder.mutation({
            query: ({ receiverId, content }) => ({
                url: `${MESSAGES_URL}`,
                method: "POST",
                body: { receiverId, content },
            }),
            invalidatesTags: (result, error, { receiverId }) => [
                { type: "Message", id: receiverId },
                "Message",
            ],
        }),
        editMessage: builder.mutation({
            query: ({ messageId, content, receiverId }) => ({
                url: `${MESSAGES_URL}/${messageId}`,
                method: "PUT",
                body: { content },
            }),
            invalidatesTags: (result, error, { receiverId }) => [
                { type: "Message", id: receiverId },
            ],
        }),
        deleteMessage: builder.mutation({
            query: ({ messageId, receiverId }) => ({
                url: `${MESSAGES_URL}/${messageId}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, { receiverId }) => [
                { type: "Message", id: receiverId },
            ],
        }),
        markMessagesAsRead: builder.mutation({
            query: (receiverId) => ({
                url: `${MESSAGES_URL}/read/${receiverId}`,
                method: "PATCH",
            }),
            invalidatesTags: (result, error, receiverId) => [
                { type: "Message", id: receiverId },
            ],
        }),
    }),
});

export const {
    useGetConversationsQuery,
    useGetMessagesQuery,
    useSendMessageMutation,
    useEditMessageMutation,
    useDeleteMessageMutation,
    useMarkMessagesAsReadMutation,
} = messageApiSlice;
