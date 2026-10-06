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
import { generateRandom } from "../../utils/BackgroundTasks";

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
    if (field === "" || field === "uiUrl") {
      delete newErrors.uiUrl;
      fields.uiUrl = (fields.uiUrl || "").trim();
      if (fields.uiUrl !== "") {
        if (!isValidUrl(fields.uiUrl)) {
          newErrors.ui = "Must be valid URL";
        } else {
          try {
            const uiResponse = await axios.get(
              removeSlashPostfix(fields.uiUrl) + "/config.json",
            );
            if (!uiResponse.data || !uiResponse.data.uiUrl) {
              newErrors.ui = "URL is not a NuoDBaaS WebUI";
            }
          } catch (ex) {
            console.log("EX", ex);
            newErrors.ui = "Unable to connect: " + ex;
          }
        }
      }
    }
    if (field === "" || field === "cpUrl") {
      delete newErrors.cpUrl;
      fields.cpUrl = (fields.cpUrl || "").trim();
      if (fields.cpUrl !== "") {
        if (!isValidUrl(fields.cpUrl)) {
          newErrors.cpUrl = "Must be valid URL";
        } else {
          try {
            await axios.get(
              removeSlashPostfix(fields.cpUrl.trim()) + "/login/providers",
            );
          } catch (ex) {
            newErrors.cpUrl = "Unable to connect: " + ex;
          }
        }
      }
    }
    if (field === "" || field === "sqlUrl") {
      delete newErrors.sqlUrl;
      fields.sqlUrl = (fields.sqlUrl || "").trim();
      if (fields.sqlUrl !== "") {
        if (!isValidUrl(fields.sqlUrl)) {
          newErrors.sqlUrl = "Must be valid URL";
        } else {
          const sqlUrl = fields.sqlUrl.endsWith("/") ? fields.sqlUrl : fields.sqlUrl + "/";
          try {
            const sqlResponse = await axios.get(sqlUrl);
            if (
              !sqlResponse.data ||
              !sqlResponse.data.includes("NuoDB SQL service")
            ) {
              newErrors.sqlUrl = "Backend URL is not an SQL service";
            }
          } catch (ex) {
            newErrors.sqlUrl = "Unable to connect: " + ex;
          }
        }
      }
    }
    delete newErrors._;
    if (
      field === "" &&
      fields.uiUrl === "" &&
      fields.cpUrl === "" &&
      fields.sqlUrl === ""
    ) {
      newErrors._ = "At least one of the URL fields need to be filled out";
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
        id: "uiUrl",
        label: t("form.editRegionSettings.label.uiBaseUrl"),
      },
      {
        id: "cpUrl",
        label: t("form.editRegionSettings.label.cpBaseUrl"),
      },
      {
        id: "sqlUrl",
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
                disabled={fields["manual"] === "false" && uiField.id !== "name"}
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
          <div style={{ color: "red" }}>{errors._}</div>
        </DialogContent>
        <DialogActions>
          <Button
            data-testid="button.add"
            onClick={async () => {
              if (!(await validate(""))) {
                return;
              }

              // remove backslash at end of base URL's
              const uiUrl = removeSlashPostfix((fields.uiUrl || "").trim());
              const cpUrl = removeSlashPostfix((fields.cpUrl || "").trim());
              const sqlUrl = removeSlashPostfix((fields.sqlUrl || "").trim());

              // save regions
              if (isNew) {
                await Auth.refreshRegions();
                const regions: RegionSettings = Auth.getRegions();
                regions.push({ name: fields.name, id: generateRandom(), manual: true, uiUrl, cpUrl, sqlUrl });
                Auth.setRegions(regions);
              } else {
                const cachedRegions: RegionSettings = Auth.getRegions();
                const cachedRegion =
                  cachedRegions[showEntry];
                await Auth.refreshRegions();
                const latestRegions: RegionSettings = Auth.getRegions();
                const latestRegion = latestRegions.find(
                  (region) =>
                    region.id === cachedRegion.id,
                );
                if (latestRegion) {
                  latestRegion.name = fields.name;
                  latestRegion.uiUrl = uiUrl;
                  latestRegion.cpUrl = cpUrl;
                  latestRegion.sqlUrl = sqlUrl;
                  Auth.setRegions(latestRegions);
                }
              }
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
          {!isNew && (
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
              <TableTh>{t("form.editRegionSettings.label.uiBaseUrl")}</TableTh>
              <TableTh>{t("form.editRegionSettings.label.cpBaseUrl")}</TableTh>
              <TableTh>{t("form.editRegionSettings.label.sqlBaseUrl")}</TableTh>
              <TableTh></TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
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
                              manual: setting.manual ? "true" : "false",
                              uiUrl: setting.uiUrl,
                              cpUrl: setting.cpUrl,
                              sqlUrl: setting.sqlUrl,
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
                  <TableCell>{setting.uiUrl}</TableCell>
                  <TableCell>{setting.cpUrl}</TableCell>
                  <TableCell>{setting.sqlUrl}</TableCell>
                  <TableCell>
                    {index === 0 ? (
                      t("form.editRegionSettings.label.active")
                    ) : (
                      <button
                        data-testid={"make-active-" + setting.name}
                        onClick={async (event) => {
                          event.preventDefault();
                          if (setting.uiUrl) {
                            window.location.href = setting.uiUrl + "?region=" + setting.id;
                          } else {
                            window.location.reload();
                          }
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
