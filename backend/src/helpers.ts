import type { TableKey, Response }  from '../../shared/src/types/types';
import type { Pool }      from 'pg';
import      { structure } from '../../shared/src/ssot/structure';

function getEntityName(table: TableKey){
  return structure.tables[table].uiName;
}

async function tryQuery(pool: Pool, queryStatement: string, queryArguments?: any): Promise<Response>{
  try {
    return {success: true , data: await pool.query(queryStatement, queryArguments), message: ''};
  } catch (error) {
    console.error(error);
    return {success: false, data: error, message: 'Internal server error'};
  }
}

function columnNamesEqualsNumber(columnsNames: string[], from: number = 1, separator: string = ','): string{
  let res: string = '';
  let i: number   = from;
  columnsNames.forEach(columnName => {
    res += `${columnName} = $${i++}` + separator;
  })
  return res.slice(0, -separator.length);
}

export { getEntityName, tryQuery, columnNamesEqualsNumber };