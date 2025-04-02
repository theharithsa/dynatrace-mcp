import { _OAuthHttpClient } from "@dynatrace-sdk/http-client";
import { QueryExecutionClient } from '@dynatrace-sdk/client-query';



export const getLogsForEntity = async (dtClient: _OAuthHttpClient, entityId: string) => {
  const queryExecutionClient = new QueryExecutionClient(dtClient);

  const response = await queryExecutionClient.queryExecute({
    body: {
      query: `fetch logs | filter dt.source_entity == "${entityId}"`,
    }
  });

  if (response.result) {
    // return response result immediately
    return response.result.records;
  }
  // else: We might have to poll
  if (response.requestToken) {
    // poll for the result
    let pollResponse;
    do {
      // sleep for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      pollResponse = await queryExecutionClient.queryPoll({
        requestToken: response.requestToken,  
      });
      // done - let's return it
      if (pollResponse.result) {
        return pollResponse.result.records;
      }
    }
    while (pollResponse.state === 'RUNNING' || pollResponse.state === 'NOT_STARTED');
  }
  // else: whatever happened - we have an error
  return undefined;
};
