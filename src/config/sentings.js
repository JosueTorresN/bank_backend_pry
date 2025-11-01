import 'dotenv/config';
const config = {
    appPort: process.env.APP_PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET,
    apiKey: process.env.API_KEY_SECRET
};

export default config;