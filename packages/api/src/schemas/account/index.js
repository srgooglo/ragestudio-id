export default {
    refreshToken: { type: String, select: false },
    username: { type: String, required: true },
    password: { type: String, required: true, select: false },
    fullName: String,
    email: String,
    createdAt: { type: String },
}