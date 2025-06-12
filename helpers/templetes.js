
const signupEmail = (otp) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Login Verification</title>
    <meta name="description" content="" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body
    style="
      font-family: Helvetica, Arial, sans-serif;
      margin: 0px;
      padding: 0px;
      background-color: #ffffff;
    ">
    <table
      role="presentation"
      style="
        width: 100%;
        border-collapse: collapse;
        border: 0px;
        border-spacing: 0px;
        font-family: Arial, Helvetica, sans-serif;
      ">
      <tbody>
        <tr>
          <td
            align="center"
            style="padding: 1rem 2rem; vertical-align: top; width: 100%"
          >
            <table
              role="presentation"
              style="
                max-width: 300px;
                border-collapse: collapse;
                border: 0px;
                border-spacing: 0px;
                text-align: left;
              "
            >
              <tbody>
                <tr>
                  <td style="padding: 20px 0px 0px">
                    <div style="text-align: center">
                      <div
                        style="
                          padding: 20px;
                          background-color: #05558E;
                          border-radius: 10px;
                          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                          border: 10px;
                          border-color: #050505;
                        "
                      >
                        <div
                          class="header"
                          style="text-align: center; margin-bottom: 0px"
                        >
                           <img
                           src="https://app.arbeitszeit.swiss:8800/app_logo.png"
                          alt="App Logo"
                            style="width: 200px; height: auto; "
                           />
                        </div>
                        <h2
                          style="
                            color: #fff;
                            margin-top: 15px;
                            margin-bottom: 15px;
                            text-align: center; 
                            font-size: 20px;
                          "
                        >
                          Email Verification
                        </h2>

                        <p style="color: #ffffff; line-height: 1">
                          Your verification code is
                        </p>
                        <span
                          class="otp-code"
                          style="
                            font-size: 24px;
                            font-weight: bold;
                            color: #ffffff;
                            margin-bottom: 5px;
                            padding: 5px;
                            letter-spacing: 10px;
                          "
                          >${otp}</span
                        >

                        <p style="color: #ffffff; line-height: 1">
                          This OTP will expire in 5 minutes
                        </p>

                        <div
                          class="footer"
                          style="
                            margin-top: 10px;
                            color: #d8d5d5;
                            font-size: 12px;
                            text-align: center;
                          "
                        >
                          <p style="color: #ffffff">
                            If you didn’t request this email, you can safely
                            ignore it.
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body> 
</html>`

const sendWorkerEmail = ({ email, password, company_name, text }) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${company_name} - Worker Account Created</title>
</head>
<body style="font-family: Helvetica, Arial, sans-serif; margin: 0px; padding: 0px; background-color: #fff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0px; border-spacing: 0px; font-family: Arial, Helvetica, sans-serif; ">
    <tbody>
      <tr>
        <td align="center" style="padding: 1rem 2rem; vertical-align: top; width: 100%;">
          <table role="presentation" style="max-width: 300px; border-collapse: collapse; border: 0px; border-spacing: 0px; text-align: left;">
            <tbody>
              <tr>
                <td style="padding: 20px 0px 0px;">
                  <div style="text-align: ;">
                    <div style="padding: 20px; background-color: #0D2D5B; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                      <div class="header" style="text-align: center; margin-bottom: 5px;">
                        <img src="https://app.arbeitszeit.swiss:8800/app_logo.png" alt="App Logo" style="width: 100px; height: 90px;">
                      </div><br/>
                      <h2 style="color: #fff; margin-top: 0; margin-bottom: 18px; text-align: center;">Your Account Details</h2>
                      <p style="color: #fff; line-height: 1; text-align: center;">We are pleased to inform you that ${text}. Please find your login details below:</p>
                      <p style="color: #fff; line-height: 1;"> Email: <span class="otp-code" style="font-size: 10px; font-weight: bold; color: #fff !important; margin-bottom: 10px;"><a style="color: #fff">${email}</a></span></p>
                      <p style="color: #fff; line-height: 1;"> Password: <span class="otp-code" style="font-size: 10px; font-weight: bold; color: #fff !important; margin-bottom: 10px;">${password}</span></p>
                      <p style="color: #fff; line-height: 1; margin-top: 20px; font-size: 12px; text-align: center;">Please use this email and password to log in to the app</p>
                      <div class="footer" style="margin-top: 20px; color: #fff; font-size: 12px; text-align: center;">
                        <p>This email was sent automatically. Please do not reply.</p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;



module.exports = { signupEmail, sendWorkerEmail }


