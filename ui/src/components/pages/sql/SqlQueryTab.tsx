// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useState } from "react";
import { withTranslation } from "react-i18next";
import { t } from "i18next";
import {
  SQL_EXTENDED_TIMEOUT,
  SqlResponse,
  SqlType,
} from "../../../utils/SqlSocket";
import Button from "../../controls/Button";
import SqlResultsRender from "./SqlResultsRender";
import Toast from "../../controls/Toast";
import Pagination, { pageFilter } from "../../controls/Pagination";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { sql, SQLDialect } from "@codemirror/lang-sql";

type SqlQueryTabProps = {
  sqlConnection: SqlType;
  dbTable: string;
};
function SqlQueryTab({ sqlConnection, dbTable }: SqlQueryTabProps) {
  const [results, setResults] = useState<SqlResponse | undefined>(undefined);
  const [sqlQuery, setSqlQuery] = useState("");
  const [executing, setExecuting] = useState(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 100;

  useEffect(() => {
    if (dbTable) {
      setSqlQuery("SELECT * FROM `" + dbTable + "` LIMIT 100");
    } else {
      setSqlQuery("CREATE TABLE `table1` (`name` VARCHAR(80))");
    }
    setResults(undefined);
  }, [dbTable]);

  const pagedResults = results ? { ...results } : undefined;
  if (pagedResults && pagedResults.rows) {
    pagedResults.rows = [...pageFilter(pagedResults.rows, page, pageSize)];
  }

  // NuoDbTypes are taken from "SELECT * FROM SYSTEM.DATATYPES"
  // NuoDbKeywords are taken from the doc (https://doc.nuodb.com/nuodb/latest/reference-information/sql-language/sql-keywords/)
  // NuoDbBuiltin are taken from "SELECT * FROM system.builtinfunctions"
  const NuoDbTypes =
    "array bigint binary blob boolean bytes char clob date double float integer number numeric smallint string time timestamp varchar varying with without zone";
  const NuoDbKeywords =
    "all and as between bits both break by call cascade case catch collate column constraint containing create current current_date current_time current_timestamp default " +
    "delete describe distinct else else_if end end_for end_function end_if end_procedure end_trigger end_try end_while enum escape execute exists false fetch following for foreign from full " +
    "generated group groups having identity if in inner inout insert into is join key leading left like limit natural nchar nclob next next_value not null numeric nvarchar octets off offset " +
    "on only or order out primary real record_batching record_number references replace restrict return right rollback rows select set show smallint starting then throw to trailing true try " +
    "unbounded union unique unknown update using var ver when where while with _record_id _record_partitionid _record_sequence _record_transaction";
  const NuoDbBuiltin =
    "abs acos aprox_count_distinct asin atan atan2 avg bit_length cast ceil ceiling char character_length char_length coalesce concat convert_tz cos cot count csvsplit current_date current_schema " +
    "current_time current_timestamp current_user dataaffinitymapping database date datediff dateinterval date_add date_from_str date_sub date_to_str day dayofweek dayofyear degrees dense_rank era extract " +
    "fetch_status floor getaggregatedscalarstats getcommitprotocol getconnectionid getcontextid geteffectiveplatformversion gethistogrambuckets gethistograms getmaxplatformversion getnodeid getpid " +
    "getreleaseversion getscalarstats getstartid getstatsmetadata gettransactionendevent gettransactionid gettransactionisolationlevel gettransactionstartevent getupdatecount greatest grouping hour " +
    "ifnull is_member is_valid_json json_contains json_contains_path json_exists json_extract json_merge_patch json_object json_query json_unquote json_value last_insert_id lcase least left " +
    "length listagg locate lower ltrim max millisecond min minute mod month msleep now nullif octet_length optional_field pi position pow power quarter quotename radians rand rank replace replicate " +
    "reverse right round rownum row_number rtrim scope_identity second sin sqrt stddev_pop stddev_samp substr substring substring_index substr_index sum tan trim typeof ucase unaccent " +
    "unicode upper user valuesbetween var_pop var_samp weekofmonth weekofyear year";

  const nuoDbDialect = SQLDialect.define({
    keywords: NuoDbKeywords,
    builtin: NuoDbBuiltin,
    types: NuoDbTypes,
  });

  return (
    <>
      <form>
        <div className="NuoRow NuoFieldContainer" style={{ gap: "5px" }}>
          <CodeMirror
            className="NuoRow"
            data-testid="sqlQuery"
            id="sqlQuery"
            value={sqlQuery}
            width="100%"
            height="200px"
            style={{ overflow: "auto" }}
            extensions={[
              sql({ dialect: nuoDbDialect }),
              EditorView.editable.of(sqlConnection && !executing),
            ]}
            onChange={(value) => setSqlQuery(value)}
          />
          <Button
            data-testid="submitSql"
            disabled={!sqlConnection || executing}
            variant="contained"
            type="submit"
            onClick={async () => {
              setExecuting(true);
              const response: SqlResponse = await sqlConnection.runCommand(
                "EXECUTE",
                [sqlQuery],
                SQL_EXTENDED_TIMEOUT,
              );
              if (response.status === "SUCCESS") {
                let shortQuery = sqlQuery.replaceAll("\n", " ");
                if (shortQuery.length > 80) {
                  shortQuery = shortQuery.substring(0, 80) + "...";
                }
                Toast.show("SUCCESS: " + shortQuery, null);
              }
              setResults(response);
              setExecuting(false);
              setPage(1);
            }}
          >
            {executing
              ? t("form.sqleditor.button.executing")
              : t("form.sqleditor.button.submit")}
          </Button>
        </div>
      </form>
      <div className="NuoTableScrollWrapper">
        <SqlResultsRender results={pagedResults} />
      </div>
      {results?.rows && (
        <Pagination
          count={Math.ceil(results.rows.length / pageSize)}
          page={page}
          setPage={setPage}
        />
      )}
    </>
  );
}

export default withTranslation()(SqlQueryTab);
