// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { MenuItemProps, PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import { styled } from '@mui/material';
import { t } from 'i18next';
import { Tab, Tabs } from '../controls/Tabs';
import SqlLogin from './sql/SqlLogin';
import SqlBrowseTab from './sql/SqlBrowseTab';
import Toast from '../controls/Toast';
import SqlQueryTab from './sql/SqlQueryTab';
import { SqlType } from '../../utils/SqlSocket';
import ComboBox from '../controls/ComboBox';
import SqlImportTab from './sql/SqlImportTab';

type SqlTabsProps = {
    dbTable: string;
    sqlConnection: SqlType | undefined;
};

function SqlTabs({ dbTable, sqlConnection }: SqlTabsProps) {
    const [tabIndex, setTabIndex] = useState<number>(0);

    if (!sqlConnection) {
        return null;
    }

    let tabs = [];
    if (dbTable) {
        tabs.push(<Tab id="browse" label={t("form.sqleditor.label.tab.browse")}>{tabIndex === tabs.length && <SqlBrowseTab sqlConnection={sqlConnection} table={dbTable} />}</Tab>);
    }
    tabs.push(<Tab id="query" label={t("form.sqleditor.label.tab.query")}>{tabIndex === tabs.length && <SqlQueryTab sqlConnection={sqlConnection} dbTable={dbTable} />}</Tab>);
    tabs.push(<Tab id="import" label={t("form.sqleditor.label.tab.import")}>{tabIndex === tabs.length && <SqlImportTab sqlConnection={sqlConnection} dbTable={dbTable} />}</Tab>);
    return <Tabs currentTab={tabIndex} setCurrentTab={(tabIndex) => setTabIndex(tabIndex)}>{tabs}</Tabs>
}

let tablesCache: string[] | undefined = undefined;

function SqlPage(props: PageProps) {
    const params = useParams();
    const [dbTable, setDbTable] = useState("");
    const [sqlConnection, setSqlConnection] = useState<SqlType | undefined | void | "">(undefined);

    const StyledBreadcrumbs = styled(Breadcrumbs)({
        '.MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap'
        }
    });

    async function loadTables(useCache: boolean): Promise<MenuItemProps[]> {
        if (!sqlConnection) {
            return new Promise((resolve) => resolve([]));
        }
        if (!useCache || !tablesCache) {
            tablesCache = [];
            const results = await sqlConnection.runCommand("EXECUTE_QUERY", ["SELECT tablename FROM system.tables where type = 'TABLE' and schema = '" + sqlConnection.getDefaultSchema() + "'"]);
            if (results.error) {
                Toast.show(results.error, results);
                setDbTable("");
            }
            else if (results.rows) {
                tablesCache = results.rows.map(row => row.values[0]);
                if (!tablesCache.includes(dbTable)) {
                    if (tablesCache.length > 0) {
                        setDbTable(tablesCache[0]);
                    }
                    else {
                        setDbTable("");
                    }
                }
            }
        }
        return new Promise((resolve) => resolve((tablesCache || []).map(table => { return { id: table, label: table, onClick: () => { setDbTable(table) } } })));
    }

    return <PageLayout {...props}>
        <div className="NuoListResourceHeader">
            <h3>{t("form.sqleditor.label.title")}</h3>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <StyledBreadcrumbs data-testid="path_component" separator=">" aria-label="resources" style={{ color: "#b5b9bc", fontSize: "1em", padding: "0 20px", display: "flex", flexWrap: "nowrap" }}>
                    {[params.organization, params.project, params.database].map(name => {
                        return <Typography color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{name}</Typography>
                    })}
                    {sqlConnection && <ComboBox loadItems={loadTables}
                        selected={dbTable}>
                        <label>{dbTable}</label>
                    </ComboBox> || <></>}
                </StyledBreadcrumbs>
            </div>
        </div>
        {sqlConnection ? <SqlTabs dbTable={dbTable} sqlConnection={sqlConnection} /> : <SqlLogin setSqlConnection={(conn: SqlType) => {
            setSqlConnection(conn);
        }} />}
    </PageLayout>;
}

export default withTranslation()(SqlPage);
