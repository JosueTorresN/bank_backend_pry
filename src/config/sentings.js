import 'dotenv/config';
const config = {
    appPort: process.env.APP_PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET,
    apiKey: process.env.API_KEY_SECRET,
    ADMIN: process.env.ADMIN,
    centralBankToken: process.env.CENTRAL_BANK_TOKEN || 'BANK-CENTRAL-IC8057-2025'
};

export default config;