import { apiSlice } from "./apiSlice";
import { PROJECTS_URL } from "../constants";

export const projectApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAllProjects: builder.query({
            query: ({ page = 1, limit = 12, techStack = "", search = "" } = {}) => ({
                url: `${PROJECTS_URL}/all-projects?page=${page}&limit=${limit}${techStack ? `&techStack=${encodeURIComponent(techStack)}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
                method: "GET",
            }),
            providesTags: ["Project"],
        }),
        getProjectById: builder.query({
            query: (projectId) => ({
                url: `${PROJECTS_URL}/${projectId}`,
                method: "GET",
            }),
            providesTags: (result, error, arg) => [{ type: "Project", id: arg }],
        }),
        getProjectsByUsername: builder.query({
            query: (username) => ({
                url: `${PROJECTS_URL}/user/${username}`,
                method: "GET",
            }),
            providesTags: ["Project"],
        }),
        createProject: builder.mutation({
            query: (formData) => ({
                url: `${PROJECTS_URL}/create-project`,
                method: "POST",
                body: formData,
            }),
            invalidatesTags: ["Project"],
        }),
        updateProject: builder.mutation({
            query: ({ projectId, formData }) => ({
                url: `${PROJECTS_URL}/update-project/${projectId}`,
                method: "PUT",
                body: formData,
            }),
            invalidatesTags: ["Project"],
        }),
        deleteProject: builder.mutation({
            query: (projectId) => ({
                url: `${PROJECTS_URL}/delete-project/${projectId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Project"],
        }),
    }),
});

export const {
    useGetAllProjectsQuery,
    useGetProjectByIdQuery,
    useGetProjectsByUsernameQuery,
    useCreateProjectMutation,
    useUpdateProjectMutation,
    useDeleteProjectMutation,
} = projectApiSlice;
