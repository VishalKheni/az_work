
const forgetPassword = (otp) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Forget password</title>
    <meta name="description" content="" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>

  <body
    style="
      font-family: Helvetica, Arial, sans-serif;
      margin: 0px;
      padding: 0px;
      background-color: #ffffff;
    "
  >
    <table
      role="presentation"
      style="
        width: 100%;
        border-collapse: collapse;
        border: 0px;
        border-spacing: 0px;
        font-family: Arial, Helvetica, sans-serif;
        background-color: rgb(239, 239, 239);
      "
    >
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
                          background-color: #F9FAFD;
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
                            src="https://carwashnearme.ae:8800/uploads/app_logo/car_wash_logo.png"
                            alt="App Logo"
                            style="width: 80px; height: auto"
                          />
                        </div>
                        <h2
                          style="
                            color: #050505;
                            margin-top: 15px;
                            margin-bottom: 15px;
                            text-align: center;
                          "
                        >
                          Reset Password
                        </h2>

                        <p style="color: #070707; line-height: 1">
                          Your verification code is
                        </p>
                        <span
                          class="otp-code"
                          style="
                            font-size: 24px;
                            font-weight: bold;
                            color: #4F7396;
                            margin-bottom: 5px;
                            padding: 5px;
                            letter-spacing: 10px;
                          "
                          >${otp}</span
                        >

                        <p style="color: #060606; line-height: 1">
                          This code will expire in 1 minutes
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
                          <p style="color: #080808">
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
    "
  >
    <table
      role="presentation"
      style="
        width: 100%;
        border-collapse: collapse;
        border: 0px;
        border-spacing: 0px;
        font-family: Arial, Helvetica, sans-serif;
        
      "
    >
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
                          background-color: #F9FAFD;
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
                           src="https://carwashnearme.ae:8800/uploads/app_logo/car_wash_logo.png"
                          alt="App Logo"
                            style="width: 50px; height: auto"
                           />
                        </div>
                        <h2
                          style="
                            color: #050505;
                            margin-top: 15px;
                            margin-bottom: 15px;
                            text-align: center;
                          "
                        >
                          Let's Sign In
                        </h2>

                        <p style="color: #070707; line-height: 1">
                          Your verification code is
                        </p>
                        <span
                          class="otp-code"
                          style="
                            font-size: 24px;
                            font-weight: bold;
                            color: #4F7396;
                            margin-bottom: 5px;
                            padding: 5px;
                            letter-spacing: 10px;
                          "
                          >${otp}</span
                        >

                        <p style="color: #060606; line-height: 1">
                          This OTP will expire in 1 minutes
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
                          <p style="color: #080808">
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


module.exports = { forgetPassword, signupEmail }
