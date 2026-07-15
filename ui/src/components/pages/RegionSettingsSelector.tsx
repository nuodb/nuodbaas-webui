// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { PageProps, RegionSettings } from "../../utils/types";
import TextField from "../controls/TextField";
import PageLayout from "./parts/PageLayout";
import Button from "../controls/Button";
import React, { ReactNode, useState } from "react";
import DialogMaterial from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableTh,
} from "../controls/Table";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import Auth from "../../utils/auth";

function RegionSelectorSettings(props: PageProps) {
  const { t } = props;
  const [showEntry, setShowEntry] = useState<number>(-1);
  const [fields, setFields] = useState<{ [field: string]: string }>({});
  const [errors, setErrors] = useState<{ [field: string]: string }>({});

  function closeDialog() {
    setShowEntry(-1);
    setFields({});
    setErrors({});
  }

  function isValidUrl(url: string) {
    if (url.startsWith("//")) {
      url = window.location.protocol + url;
    } else if (url.startsWith("/")) {
      url = window.location.protocol + "//" + window.location.host + url;
    }
    if (
      !url.toLowerCase().startsWith("http://") &&
      !url.toLowerCase().startsWith("https://")
    ) {
      return false;
    }
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /* removes all the slashes at the end of the string */
  function removeSlashPostfix(str: string) {
    while (str.endsWith("/")) {
      str = str.substring(0, str.length - 1);
    }
    return str;
  }

  async function validate(field: string): Promise<boolean> {
    const newErrors = { ...errors };
    if (field === "" || field === "name") {
      delete newErrors.name;
      if ((fields.name || "").trim().length === 0) {
        newErrors.name = "Required";
      }
    }
    if (field === "" || field === "cp") {
      delete newErrors.cp;
      if ((fields.cp || "").trim().length === 0) {
        newErrors.cp = "Required";
      } else if (!isValidUrl(fields.cp)) {
        newErrors.cp = "Must be valid URL";
      } else {
        try {
          await axios.get(
            removeSlashPostfix(fields.cp.trim()) + "/login/providers",
          );
        } catch (ex) {
          newErrors.cp = "Unable to connect: " + ex;
        }
      }
    }
    if (field === "" || field === "sql") {
      delete newErrors.sql;
      if (fields.sql) {
        if (!isValidUrl(fields.sql)) {
          newErrors.sql = "Must be valid URL";
        } else {
          const sql = fields.sql.endsWith("/") ? fields.sql : fields.sql + "/";
          try {
            const sqlResponse = await axios.get(sql);
            if (
              !sqlResponse.data ||
              !sqlResponse.data.includes("NuoDB SQL service")
            ) {
              newErrors.sql = "Backend URL is not an SQL service";
            }
          } catch (ex) {
            newErrors.sql = "Unable to connect: " + ex;
          }
        }
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  function renderDialog(): ReactNode {
    const isNew = showEntry >= combinedRegions().length;
    const uiFields = [
      {
        id: "name",
        label: t("form.editRegionSettings.label.name"),
      },
      {
        id: "cp",
        label: t("form.editRegionSettings.label.cpBaseUrl"),
      },
      {
        id: "sql",
        label: t("form.editRegionSettings.label.sqlBaseUrl"),
      },
    ];

    return (
      <DialogMaterial open={showEntry >= 0} fullWidth={true}>
        <DialogContent>
          <h3>
            {isNew
              ? t("form.editRegionSettings.label.addRegionEntry")
              : t("form.editRegionSettings.label.editRegionEntry")}
          </h3>
          {uiFields.map((uiField) => (
            <div className="NuoFieldContainer">
              <TextField
                id={uiField.id}
                label={uiField.label}
                value={fields[uiField.id] || ""}
                onChange={({ currentTarget }) => {
                  setFields({ ...fields, [uiField.id]: currentTarget.value });
                }}
                onBlur={() => {
                  validate(uiField.id);
                }}
                error={errors[uiField.id]}
              />
            </div>
          ))}
        </DialogContent>
        <DialogActions>
          <Button
            data-testid="button.add"
            onClick={async () => {
              if (!(await validate(""))) {
                return;
              }

              // remove backslash at end of base URL's
              const cp = removeSlashPostfix((fields.cp || "").trim());
              const sql = removeSlashPostfix((fields.sql || "").trim());

              // save regions
              const regions: RegionSettings = Auth.getRegions();
              if (isNew) {
                regions.push({ name: fields.name, cp, sql });
              } else {
                regions[showEntry - props.regions.length] = {
                  ...regions[showEntry - props.regions.length],
                  name: fields.name,
                  cp,
                  sql,
                };
              }
              Auth.setRegions(regions);
              closeDialog();
            }}
          >
            {isNew ? t("button.add") : t("button.save")}
          </Button>
          <Button
            data-testid="button.cancel"
            onClick={() => {
              closeDialog();
            }}
          >
            {t("button.cancel")}
          </Button>
          {!isNew && showEntry >= props.regions.length && (
            <button
              data-testid="button.delete"
              className="deleteButton"
              onClick={() => {
                const regions = Auth.getRegions();
                regions.splice(showEntry, 1);
                Auth.setRegions(regions);
                closeDialog();
              }}
            >
              <DeleteIcon />
              {t("button.delete")}
            </button>
          )}
        </DialogActions>
      </DialogMaterial>
    );
  }

  function combinedRegions() {
    return [
      ...props.regions.map((region) => ({ ...region, custom: false })),
      ...Auth.getRegions().map((region) => ({ ...region, custom: true })),
    ];
  }

  return (
    <PageLayout {...props}>
      {renderDialog()}
      <div className="NuoTableNoData">
        <div
          className="NuoRow"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h3>{t("form.editRegionSettings.title")}</h3>
        </div>
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>{t("form.editRegionSettings.label.name")}</TableTh>
              <TableTh>{t("form.editRegionSettings.label.cpBaseUrl")}</TableTh>
              <TableTh>{t("form.editRegionSettings.label.sqlBaseUrl")}</TableTh>
              <TableTh></TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                {t("form.editRegionSettings.label.defaultRegion")}
              </TableCell>
              <TableCell>{Auth.getDefaultCpPrefixPath()}</TableCell>
              <TableCell>{Auth.getDefaultSqlPrefixPath()}</TableCell>
              <TableCell>
                {!Auth.getCurrentRegion() ? (
                  t("form.editRegionSettings.label.active")
                ) : (
                  <button
                    data-testid={"make-active-default"}
                    onClick={(event) => {
                      event.preventDefault();
                      Auth.setCurrentRegion(null);
                      window.location.reload();
                    }}
                  >
                    {t("form.editRegionSettings.label.makeActive")}
                  </button>
                )}
              </TableCell>
            </TableRow>
            {combinedRegions().map((setting, index) => {
              return (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      {setting.custom ? (
                        <button
                          onClick={() => {
                            setFields({
                              name: setting.name,
                              cp: setting.cp,
                              sql: setting.sql,
                            });
                            setShowEntry(index);
                          }}
                        >
                          {setting.name}
                        </button>
                      ) : (
                        setting.name
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{setting.cp}</TableCell>
                  <TableCell>{setting.sql}</TableCell>
                  <TableCell>
                    {Auth.isCurrentRegion(setting) ? (
                      t("form.editRegionSettings.label.active")
                    ) : (
                      <button
                        data-testid={"make-active-" + setting.name}
                        onClick={(event) => {
                          event.preventDefault();
                          Auth.setCurrentRegion(setting);
                          window.location.reload();
                        }}
                      >
                        {t("form.editRegionSettings.label.makeActive")}
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "10px 0 0 0",
          }}
        >
          <Button
            onClick={async () => {
              setShowEntry(combinedRegions().length);
            }}
          >
            {t("button.add")}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

export default withTranslation()(RegionSelectorSettings);
