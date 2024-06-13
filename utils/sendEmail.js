const nodemailer = require('nodemailer')

exports.sendmail = async function (req, user) {
  try {
    // Generate an OTP using otp-generator

    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: "no-reply@brainylingo.co.uk",
        pass: "BrainyPa$$code",
      },
    });

    const mailOptions = {
      from: "no-reply@brainylingo.co.uk",
      to: "dev23.mxpertz@gmail.com",
      subject: "HII",
      text: `HII`,
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP sent to:");
  } catch (error) {
    console.error("OTP Send Error:", error);
    throw error;
  }
};
