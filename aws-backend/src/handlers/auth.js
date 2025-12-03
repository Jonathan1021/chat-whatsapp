const { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, AdminConfirmSignUpCommand, GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { saveUser } = require('./users');

const client = new CognitoIdentityProviderClient({});

exports.login = async (event) => {
  const { email, password } = JSON.parse(event.body);

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });

    const response = await client.send(command);

    // Obtener info del usuario y guardar en DynamoDB
    const getUserCommand = new GetUserCommand({
      AccessToken: response.AuthenticationResult.AccessToken
    });
    const userInfo = await client.send(getUserCommand);
    const userId = userInfo.UserAttributes.find(attr => attr.Name === 'sub').Value;
    const userName = userInfo.UserAttributes.find(attr => attr.Name === 'name').Value;
    
    await saveUser(userId, email, userName);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        token: response.AuthenticationResult.IdToken,
        accessToken: response.AuthenticationResult.AccessToken,
        refreshToken: response.AuthenticationResult.RefreshToken
      })
    };
  } catch (error) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  }
};

exports.refresh = async (event) => {
  const { refreshToken } = JSON.parse(event.body);

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    });

    const response = await client.send(command);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        token: response.AuthenticationResult.IdToken,
        accessToken: response.AuthenticationResult.AccessToken,
        refreshToken: refreshToken
      })
    };
  } catch (error) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid refresh token' })
    };
  }
};

exports.register = async (event) => {
  const { email, password, name } = JSON.parse(event.body);

  try {
    const signUpCommand = new SignUpCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name }
      ]
    });

    const signUpResponse = await client.send(signUpCommand);

    // Auto-confirmar usuario (solo para dev)
    const confirmCommand = new AdminConfirmSignUpCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email
    });

    await client.send(confirmCommand);

    // Guardar usuario en DynamoDB
    const userId = signUpResponse.UserSub;
    await saveUser(userId, email, name);

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'User registered successfully' })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
