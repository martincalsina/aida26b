import { getPkFields } from '../../shared/src/utils/utils';
import { TableKey    } from '../../shared/src/types/types';
import { structure   } from '../../shared/src/ssot/structure';

function incorrectAmountOfPKParameters(pks: string[], tableName: string) {
  return pks.length !== 0 && pks.length !== getPkFields(tableName as TableKey).length;
}

function isValidTable(tableName: string) : boolean{
  return Object.keys(structure.tables).includes(tableName); 
}

function invalidPKFieldNames(table: TableKey, fieldNames: string[]){
  return getPkFields(table) === fieldNames;
}

export { incorrectAmountOfPKParameters, isValidTable, invalidPKFieldNames };