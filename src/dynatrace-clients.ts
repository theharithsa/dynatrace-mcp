import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';
import { getSSOUrl } from 'dt-app';


// {"errorCode":400,"message":"Bad Request","issueId":"<some-id>","error":"invalid_request","error_description":""}

export interface OAuthTokenResponse {
  scope?: string;
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  errorCode?: number;
  message?: string;
  issueId?: string;
  error?: string;
  error_description?: string;
}

/**
 * Uses the provided oauth Client ID and Secret and requests a token
 * @param clientId - OAuth Client ID for Dynatrace
 * @param clientSecret - Oauth Client Secret for Dynatrace
 * @param authUrl - SSO Authentication URL
 * @param scopes - List of requested scopes
 * @returns
 */
const requestToken = async (clientId: string, clientSecret: string, authUrl: string, scopes: string[]): Promise<OAuthTokenResponse> => {
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: scopes.join(' '),
    }),
  });
  // check if the response was okay (HTTP 2xx) or not (HTTP 4xx or 5xx)
  if (!res.ok) {
    // log the error
    console.error(`Failed to fetch token: ${res.status} ${res.statusText}`);
  }
  // and return the JSON result, as it contains additional information
  return await res.json();
}

/** Create an Oauth Client based on clientId, clientSecret, environmentUrl and scopes */
export const createOAuthClient = async (clientId: string, clientSecret: string, environmentUrl: string, scopes: string[]): Promise<_OAuthHttpClient> => {
  if (!clientId) {
    throw new Error('Failed to retrieve OAuth client id from env "DT_APP_OAUTH_CLIENT_ID"');
  }
  if (!clientSecret) {
    throw new Error('Failed to retrieve OAuth client secret from env "DT_APP_OAUTH_CLIENT_SECRET"');
  }
  if (!environmentUrl) {
    throw new Error('Failed to retrieve environment URL from env "DT_ENVIRONMENT"');
  }

  console.error(`Trying to authenticate API Calls to ${environmentUrl} via OAuthClientId ${clientId}`);

  const ssoBaseUrl = await getSSOUrl(environmentUrl);
  const ssoAuthUrl = new URL('/sso/oauth2/token', ssoBaseUrl).toString();
  console.error(`Using SSO auth URL: ${ssoAuthUrl}`);

  // try to request a token, just to verify that everything is set up correctly
  const tokenResponse = await requestToken(clientId, clientSecret, ssoAuthUrl, scopes);

  // in case we didn't get a token, or error / error_description / issueId is set, we throw an error
  if (!tokenResponse.access_token || tokenResponse.error || tokenResponse.error_description || tokenResponse.issueId) {
    throw new Error(`Failed to retrieve OAuth token (IssueId: ${tokenResponse.issueId}): ${tokenResponse.error} - ${tokenResponse.error_description}. Note: Your OAuth client is most likely not configured correctly.`);
  }
  console.error(`Successfully retrieved token from SSO!`);

  return new _OAuthHttpClient({
    scopes,
    clientId,
    secret: clientSecret,
    environmentUrl,
    authUrl: ssoAuthUrl,
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
