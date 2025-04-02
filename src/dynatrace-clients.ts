import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';
import { getSSOUrl } from 'dt-app';

/** Create an Oauth Client based on clientId, clientSecret, environmentUrl and scopes */
export const createOAuthClient = async (clientId: string, clientSecret: string, environmentUrl: string, scopes: string[]): Promise<_OAuthHttpClient> => {
  const baseUrl = await getSSOUrl(environmentUrl);

  if (!clientId) {
    throw new Error('Failed to retrieve OAuth client id from env "DT_APP_OAUTH_CLIENT_ID"');
  }
  if (!clientSecret) {
    throw new Error('Failed to retrieve OAuth client secret from env "DT_APP_OAUTH_CLIENT_SECRET"');
  }
  console.error(`baseUrl=${baseUrl}`);
  return new _OAuthHttpClient({
    scopes,
    clientId,
    secret: clientSecret,
    environmentUrl,
    authUrl: new URL('/sso/oauth2/token', baseUrl).toString(),
  });
};

/** Helper function to call an app-function via platform-api */
export const callAppFunction = async (dtClient: _OAuthHttpClient, appId: string, functionName: string, payload: any) => {
  console.error(`Sending payload ${JSON.stringify(payload)}`);

  const response = await dtClient.send({
    url: `/platform/app-engine/app-functions/v1/apps/${appId}/api/${functionName}`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload,
    statusValidator: (status: number) => {
      return [200].includes(status);
    },
  });

  return await response.body('json');
}
