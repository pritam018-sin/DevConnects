class ApiResponse {
    constructor(
        statusCode,
        arg2 = null,
        arg3 = "Success"
    ) {
        this.statusCode = statusCode;
        this.success = statusCode < 400;

        if (typeof arg2 === "string" && arg3 !== null && typeof arg3 !== "string") {
            this.message = arg2;
            this.data = arg3;
        } else {
            this.data = arg2;
            this.message = typeof arg3 === "string" ? arg3 : "Success";
        }
    }
}
export { ApiResponse };
