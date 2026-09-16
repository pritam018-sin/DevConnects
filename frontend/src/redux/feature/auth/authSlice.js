import { createSlice } from "@reduxjs/toolkit";

let userInfoFromStorage = null;
let accessTokenFromStorage = null;
let refreshTokenFromStorage = null;

try {
    const raw = localStorage.getItem("userInfo");
    if (raw && raw !== "undefined") userInfoFromStorage = JSON.parse(raw);
    accessTokenFromStorage = localStorage.getItem("accessToken") || null;
    refreshTokenFromStorage = localStorage.getItem("refreshToken") || null;
} catch (err) {
    userInfoFromStorage = null;
    accessTokenFromStorage = null;
    refreshTokenFromStorage = null;
}

const initialState = {
    userInfo: userInfoFromStorage,
    accessToken: accessTokenFromStorage,
    refreshToken: refreshTokenFromStorage,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            // action.payload expected: { user, accessToken, refreshToken }
            const { user, accessToken, refreshToken } = action.payload || {};
            state.userInfo = user || null;
            state.accessToken = accessToken || null;
            state.refreshToken = refreshToken || null;

            if (user) localStorage.setItem("userInfo", JSON.stringify(user));
            else localStorage.removeItem("userInfo");

            if (accessToken) localStorage.setItem("accessToken", accessToken);
            else localStorage.removeItem("accessToken");

            if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
            else localStorage.removeItem("refreshToken");
        },
        updateAccessToken: (state, action) => {
            state.accessToken = action.payload;
            if (action.payload) localStorage.setItem("accessToken", action.payload);
            else localStorage.removeItem("accessToken");
        },
        logout: (state) => {
            state.userInfo = null;
            state.accessToken = null;
            state.refreshToken = null;
            localStorage.removeItem("userInfo");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
        },
    },
});

export const { setCredentials, updateAccessToken, logout } = authSlice.actions;
export default authSlice.reducer;
