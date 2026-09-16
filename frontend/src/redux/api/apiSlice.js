import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout, updateAccessToken } from "../feature/auth/authSlice";
import { BASE_URL, USERS_URL } from "../constants.js";

const baseQuery = fetchBaseQuery({
    baseUrl: BASE_URL,
    credentials: "include", // Backend HTTP-Only cookies bhej sake isliye zaroori hai
    prepareHeaders: (headers, { getState }) => {
        const token = getState().auth.accessToken;
        if (token) headers.set("authorization", `Bearer ${token}`);
        return headers;
    },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
    // 1. Pehle normal request try karo
    let result = await baseQuery(args, api, extraOptions);

    // 2. Agar 401 aaya, matlab token expire ho gaya (login API ko chhodkar)
    if (result?.error && result.error.status === 401 && args.url !== `${USERS_URL}/login`) {
        try {
            // Refresh token API call karo
            const refreshResult = await baseQuery(
                {
                    url: `${USERS_URL}/refresh-token`,
                    method: "POST",
                },
                api,
                extraOptions
            );

            // 3. Agar naya token mil gaya
            if (refreshResult?.data) {
                // Backend se ApiResponse me data ke andar accessToken aata hai
                const newAccessToken = refreshResult.data.data?.accessToken;

                if (newAccessToken) {
                    // Redux state me naya token update karo
                    api.dispatch(updateAccessToken(newAccessToken));
                }

                /* 
                 HINT: newRefreshToken ko manually save karne ki zaroorat nahi hai.
                 Backend ne "httpOnly" cookie me use set kar diya hai, browser use 
                 automatically manage karega aur agli API calls me attach kar dega.
                */

                // 4. Puraani failed request ko naye token ke sath retry karo
                result = await baseQuery(args, api, extraOptions);
            } else {
                // Agar refresh api bhi fail ho gayi (jaise refresh token expire ho gaya)
                api.dispatch(logout());
            }
        } catch (err) {
            api.dispatch(logout());
        }
    }

    return result;
};

export const apiSlice = createApi({
    baseQuery: baseQueryWithReauth,
    tagTypes: ["User", "Post", "Project", "Comment", "Like", "Follow", "Notification", "Message"],
    endpoints: () => ({}),
});