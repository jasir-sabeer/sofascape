require('dotenv').config(); 

module.exports = {
  apps: [
    {
      name: 'app',
      script: 'app.js',
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        MONGODB_URI: process.env.MONGODB_URI,
        GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
        NODEMAILER_EMAIL: process.env.NODEMAILER_EMAIL,
        NODEMAILER_PASSWORD: process.env.NODEMAILER_PASSWORD,
        RAZOR_PAY_ID: process.env.RAZOR_PAY_ID,
        RAZOR_PAY_SECRET: process.env.RAZOR_PAY_SECRET
      }
    }
  ]
};
