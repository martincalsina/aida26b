import      { sendSuccessOperationMessage, sendNotFoundMessage, sendErrorMessage } from "../status_messages";
import      { getEntityName, tryQuery, columnNamesEqualsNumber } from '../helpers';
import      { assertValidDeleteInstance } from '../assertions';
import type { TableKey, Response } from "../../../shared/src/types/types";
import      { getPkFields } from "../../../shared/src/utils/utils";
import        express from 'express';
import      { Pool } from "pg";

export async function deleteHandler(req: express.Request, res: express.Response, pool: Pool) {
  const tableName: string = req.params.tableName;
  const pkFieldsNames: string[] = Object.values(req.query) as string[]; 
  const entityName = getEntityName(tableName as TableKey);
  
  if (assertValidDeleteInstance(tableName, res, pkFieldsNames, entityName)){
    const whereArgumentsString = columnNamesEqualsNumber(getPkFields(tableName as TableKey), 1, ' AND ');
    const query: string = `DELETE FROM ${tableName} WHERE ${whereArgumentsString} RETURNING *`;
    const queryResponse: Response = await tryQuery(pool, query, Object.values(req.query));
    if (queryResponse.data?.rowCount === 0) return sendNotFoundMessage(res, entityName);
    else if(!queryResponse.success) return sendErrorMessage(res, queryResponse.message);
    return sendSuccessOperationMessage(res, entityName, queryResponse.data?.rows?.[0], 'deleted', 200);
  }
}
