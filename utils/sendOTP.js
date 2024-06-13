const sgMail = require('@sendgrid/mail');

async function SendEmail_OTP(email, otp) {
  try {
    sgMail.setApiKey(process.env.Send_Grid_Api_Key);
    const msg = {
      to: email,
      from: {
        name: "Recovery OTP",
        email: process.env.Sender_Email
      },
      templateId: process.env.Template_ID,
      dynamicTemplateData: {
        otp: otp
      }
    };
    const sendedmessage = await sgMail.send(msg);
    console.log("Signup Email has been sent!");
    return sendedmessage; // Return the result of sending the email
    
  } catch (error) {
    console.error(error);
    return error;
  }
}

function generateOTP(length) {
  const charset = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    otp += charset[randomIndex];
  }
  return otp;
}

const sendOTP = async (email) => {
  try {
    const otp = generateOTP(6); // Generate a 6-digit OTP
   const MailData =  await SendEmail_OTP(email, otp);
  //  console.log(MailData)
    return otp;
  } catch (error) {
    console.error(error);
    throw error; // Throw the error to be handled where the function is called
  }
};

module.exports = sendOTP;
