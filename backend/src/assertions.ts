import { isValidTable, incorrectAmountOfPKParameters, invalidPKFieldNames } from './validations';
import { sendNotFoundMessage, sendInvalidInstanceMessage } from './status_messages';
import { TableKey } from '../../shared/src/types/types';
import   express  from 'express';

function assertValidDeleteInstance(tableName: string, res: express.Response, pkFieldsNames: string[], entityName: string){
  if (!isValidTable(tableName)){
    sendNotFoundMessage(res, `Invalid table`);
    return false;
  }
  if (incorrectAmountOfPKParameters(pkFieldsNames, tableName)){
    sendInvalidInstanceMessage(res, `Insufficient amount of fields to identify a/an ${entityName}`);
    return false;
  }
  if (invalidPKFieldNames(tableName as TableKey, pkFieldsNames)){
    sendInvalidInstanceMessage(res, `Invalid fields to identify a/an ${entityName}`);
    return false;
  }
  return true;
}

export { assertValidDeleteInstance };
