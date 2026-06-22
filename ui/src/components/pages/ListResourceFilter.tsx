// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { ChangeEvent, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "../controls/Table";
import { withTranslation } from "react-i18next";
import Select, { SelectOption } from "../controls/Select";
import TextField from "../controls/TextField";
import Button from "../controls/Button";
import DialogMaterial from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import { t } from "i18next";
import Checkboxes from "../controls/Checkboxes";

const filterOptions = [
  "search",
  "contains",
  "startsWith",
  "endsWith",
  "exists",
  "notExists",
  "=",
  "!=",
  ">=",
  "<=",
  "~",
  "raw",
] as const;
export type FilterCondition = (typeof filterOptions)[number];

export type SearchType = {
  field: string; //field name. "[]" postfix indicates an array field, ".*" postfix indicates a map
  condition: FilterCondition; // comparator
  value: string; // value to search for. Unused for "exists" and "notExists" conditions
  key: string; // used for a "map" field to search keys
  ignoreCase: boolean; // ignore case
  label?: string; // stores the label shown in the list of the react-select control
};

/* makeFieldFilterUrl() and parseFieldFilterUrl() are used to encode/decode SearchType[]
   into a string which reduces length and voids encoding quotes, braces twice
   - the length is a base62 encoded two digit number (giving it a maximum length of 62*62 = 3844 bytes)
   Format:
   1. hard coded length of 5 (field count)
   2. length + value of field "field"
   3. length + value of field "condition"
   4. length + value of field "key"
   5. length + value of field "value"
   6. length of 1 + value of field "ignoreCase" ("T" for true, "F" for false)
   7. repeat items 2-7 for each additional search field
*/

function escape(str: string) {
  if (typeof str !== "string") str = String(str);
  return str.replace(/!/g, "!!").replace(/_/g, "!_").replace(/~/g, "!~");
}

function unescape(str: string) {
  return str.replace(/!~/g, "~").replace(/!_/g, "_").replace(/!!/g, "!");
}

export function makeFieldFilterUrl(search: SearchType[]) {
  return search
    .map((s) => {
      return [s.field, s.condition, s.value, s.key, s.ignoreCase ? "T" : "F"]
        .map((val) => escape(val))
        .join("_");
    })
    .join("~");
}

export function parseFieldFilterUrl(ff: string | null): SearchType[] {
  const rowRegex = /(?<!!)~/g; // unescaped tilde
  const valRegex = /(?<!!)_/g; // unescaped underscores
  if (!ff) {
    return [];
  }
  const rows = ff.split(rowRegex);

  const ret = rows.map((row) => {
    const vals = row.split(valRegex).map((r) => unescape(r));
    while (vals.length < 5) {
      vals.push("");
    }
    return {
      field: vals[0],
      condition: vals[1] as FilterCondition,
      value: vals[2],
      key: vals[3],
      ignoreCase: vals[4] === "T" ? true : false,
    };
  });
  return ret;
}

export function isSameSearch(s1: SearchType, s2: SearchType): boolean {
  if (s1.field !== s2.field) return false;
  if (s1.condition !== s2.condition) return false;
  if (s1.value !== s2.value) return false;
  if (s1.ignoreCase !== s2.ignoreCase) return false;
  if (s1.label !== s2.label) return false;
  return true;
}

function escapeRegex(value: string) {
  // Matches all special regex characters and prepends them with a backslash
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getFieldFilter(search: SearchType) {
  let fieldName = search.field.replaceAll(/\[\]|(\.\*)$/g, "");
  if (search.field.endsWith(".*") && !!search.key) {
    fieldName +=
      "['" + search.key.replaceAll("\\", "\\\\").replaceAll("'", "\\'") + "']";
  }
  const fieldRegex = "{" + fieldName + "}";
  const namePrefix = fieldRegex + "~" + (search.ignoreCase ? "(?i)" : "");
  switch (search.condition) {
    case "search":
      if (search.ignoreCase) {
        return "{$.*}~(?i).*" + escapeRegex(search.value) + ".*";
      } else {
        return "{$.*}~.*" + escapeRegex(search.value) + ".*";
      }
    case "contains":
      return namePrefix + ".*" + escapeRegex(search.value) + ".*";
    case "startsWith":
      return namePrefix + escapeRegex(search.value) + ".*";
    case "endsWith":
      return namePrefix + ".*" + escapeRegex(search.value);
    case "exists":
      return fieldRegex;
    case "notExists":
      return "!" + fieldRegex;
    case "=":
      return namePrefix + escapeRegex(search.value);
    case "!=":
    case ">=":
    case "<=":
      if (search.ignoreCase) {
        return (
          fieldRegex +
          search.condition +
          "(?!(?i)" +
          escapeRegex(search.value) +
          "$)"
        );
      } else {
        return fieldRegex + search.condition + escapeRegex(search.value);
      }
    case "~":
      return namePrefix + search.value;
    case "raw":
      return search.value;
  }
}

export function getFieldFilterLabel(search: SearchType) {
  let fieldName = search.field.replaceAll(/(\.\*)$/g, "");
  if (search.field.endsWith(".*") && !!search.key) {
    fieldName += "." + search.key;
  }
  switch (search.condition) {
    case "search":
      return "search(" + search.value + ")";
    case "contains":
      return fieldName + "=*" + search.value + "*";
    case "startsWith":
      return fieldName + "=" + search.value + "*";
    case "endsWith":
      return fieldName + "=*" + search.value;
    case "exists":
      return "exists(" + fieldName + ")";
    case "notExists":
      return "notExists(" + fieldName + ")";
    case "=":
    case "!=":
    case ">=":
    case "<=":
    case "~":
      return fieldName + search.condition + search.value;
    case "raw":
      return "fieldFilter(" + search.value + ")";
  }
}

type ListResourceFilterProps = {
  editIndexOrNewField: string | number | null;
  fields: { [fieldName: string]: string };
  search: SearchType[];
  setSearch: (filter: SearchType[] | null) => void;
};

function ListResourceFilter({
  editIndexOrNewField,
  fields,
  search,
  setSearch,
}: ListResourceFilterProps) {
  const [editSearch, setEditSearch] = useState<SearchType[]>([
    { field: "", condition: "contains", key: "", value: "=", ignoreCase: true },
  ]);
  const [editIndex, setEditIndex] = useState<number>(0);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editIndexOrNewField === null) {
      return;
    }
    if (typeof editIndexOrNewField === "number") {
      setEditSearch(search);
      setEditIndex(editIndexOrNewField);
    } else {
      setEditSearch([
        ...search,
        {
          field: editIndexOrNewField,
          condition: "contains",
          key: "",
          value: "",
          ignoreCase: true,
        },
      ]);
      setEditIndex(search.length);
    }
  }, [search, editIndexOrNewField]);

  if (editIndexOrNewField === null) {
    return null;
  }

  function renderCondition() {
    const conditions = [...filterOptions];
    return (
      <TableRow>
        <TableCell>{t("dialog.searchFilter.label.condition")}</TableCell>
        <TableCell>
          <Select
            id="condition"
            value={editSearch[editIndex].condition}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const newEditSearch: SearchType[] = [...editSearch];
              newEditSearch[editIndex].condition = event.target
                .value as FilterCondition;
              setEditSearch(newEditSearch);
            }}
          >
            {conditions.map((fo) => (
              <SelectOption value={fo}>
                {t("dialog.searchFilter.options." + fo)}
              </SelectOption>
            ))}
          </Select>
        </TableCell>
      </TableRow>
    );
  }

  function showField() {
    return !["search", "raw"].includes(editSearch[editIndex].condition);
  }

  function renderField() {
    if (!showField()) {
      return null;
    }
    return (
      <TableRow>
        <TableCell>{t("dialog.searchFilter.label.forField")}</TableCell>
        <TableCell>
          <Select
            id="field"
            value={editSearch[editIndex].field}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const newEditSearch: SearchType[] = [...editSearch];
              newEditSearch[editIndex].field = event.target.value;
              setEditSearch(newEditSearch);
            }}
          >
            {Object.keys(fields).map((fo) => (
              <SelectOption value={fo}>{fo}</SelectOption>
            ))}
          </Select>
          {editSearch[editIndex].field.indexOf("[]") !== -1 &&
            editSearch[editIndex].condition !== "contains"}
        </TableCell>
      </TableRow>
    );
  }

  function showKey() {
    if (["search", "raw"].includes(editSearch[editIndex].condition)) {
      return false;
    }
    if (!editSearch[editIndex].field.endsWith(".*")) {
      return false;
    }
    return true;
  }

  function renderKey() {
    if (!showKey()) {
      return null;
    }
    return (
      <TableRow>
        <TableCell>
          {t("dialog.searchFilter.label.key", {
            fieldname: editSearch[editIndex].field,
          })}
        </TableCell>
        <TableCell>
          <TextField
            id="key"
            label=""
            value={editSearch[editIndex].key || ""}
            onChange={(
              event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              const newEditSearch = [...editSearch];
              newEditSearch[editIndex].key = event.currentTarget.value;
              setEditSearch(newEditSearch);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(editSearch);
              }
            }}
          />
        </TableCell>
      </TableRow>
    );
  }

  function renderIgnoreCase() {
    if (
      ["search", "raw", "exists", "notExists"].includes(
        editSearch[editIndex].condition,
      )
    ) {
      return null;
    }
    return (
      <TableRow>
        <TableCell>{t("dialog.searchFilter.label.ignoreCase")}</TableCell>
        <TableCell>
          <Checkboxes
            items={[
              {
                id: "ignoreCase",
                label: " ",
                selected: editSearch[editIndex].ignoreCase,
              },
            ]}
            setItems={() => {
              const newEditSearch = [...editSearch];
              newEditSearch[editIndex].ignoreCase =
                !newEditSearch[editIndex].ignoreCase;
              setEditSearch(newEditSearch);
            }}
          />
        </TableCell>
      </TableRow>
    );
  }

  function renderValue() {
    if (["exists", "notExists"].includes(editSearch[editIndex].condition)) {
      return null;
    }
    return (
      <TableRow>
        <TableCell>{t("dialog.searchFilter.label.value")}</TableCell>
        <TableCell>
          <TextField
            id="value"
            label=""
            value={editSearch[editIndex].value || ""}
            onChange={(
              event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              const newEditSearch = [...editSearch];
              newEditSearch[editIndex].value = event.currentTarget.value;
              setEditSearch(newEditSearch);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(editSearch);
              }
            }}
          />
        </TableCell>
      </TableRow>
    );
  }

  function getErrors(): string[] {
    const errors: string[] = [];
    if ("contains" !== editSearch[editIndex].condition) {
      if (showField() && editSearch[editIndex].field.endsWith("[]")) {
        errors.push(
          t("dialog.searchFilter.label.arrayFieldRequiresContainsCondition"),
        );
      }
      if (
        showField() &&
        editSearch[editIndex].field.endsWith(".*") &&
        !editSearch[editIndex].key
      ) {
        errors.push(
          t("dialog.searchFilter.label.mapFieldRequiresContainsCondition"),
        );
      }
    }
    return errors;
  }

  return (
    <DialogMaterial open={true} maxWidth="xl">
      <DialogTitle>
        {typeof editIndexOrNewField === "number"
          ? t("dialog.searchFilter.editTitle")
          : t("dialog.searchFilter.addTitle")}
      </DialogTitle>
      <DialogContent>
        <Table>
          <TableHead></TableHead>
          <TableBody>
            {renderCondition()}
            {renderField()}
            {renderKey()}
            {renderValue()}
            {renderIgnoreCase()}
          </TableBody>
        </Table>
        {errors.map((error) => (
          <div style={{ color: "red", fontWeight: "bold" }}>{error}</div>
        ))}
      </DialogContent>
      <DialogActions>
        <Button
          data-testid={"dialog_button_ok"}
          onClick={async () => {
            const errors = getErrors();
            setErrors(errors);
            if (errors.length === 0) {
              if (!showField()) {
                editSearch[editIndex].field = "";
              }
              if (!showKey()) {
                editSearch[editIndex].key = "";
              }
              setSearch(editSearch);
            }
          }}
        >
          {t("button.ok")}
        </Button>
        <Button
          data-testid={"dialog_button_cancel"}
          onClick={() => {
            setSearch(null);
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogMaterial>
  );
}

export default withTranslation()(ListResourceFilter);
