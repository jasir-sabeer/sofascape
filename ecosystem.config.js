module.exports = {
  apps: [
    {
      name: 'app',
      script: './app.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SESSION_SECRET: 'mySecret',
        GOOGLE_CLIENT_ID: '50816437870-ba2h228h4fqa9v9loo5cd2nuortdb6j4.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: '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',
        GOOGLE_CALLBACK_URL: 'https://sofasacpe.3utilities.com/auth/google/callback',
        MONGODB_URI: 'mongodb+srv://SOFASCAPE:jasir%26jasi@cluster0.9eegw.mongodb.net/sofascape?retryWrites=true&w=majority&appName=Cluster0',
        NODEMAILER_EMAIL: 'jasirsabeer52@gmail.com',
        NODEMAILER_PASSWORD: 'brle mfwh rtyy wdjc',
        RAZOR_PAY_ID: 'rzp_test_PK79kuFlXvgTpG',
        RAZOR_PAY_SECRET: 'bfeBWFRX63XCWCJ1GOwCQ1xA',
      }
    }
  ]
};
