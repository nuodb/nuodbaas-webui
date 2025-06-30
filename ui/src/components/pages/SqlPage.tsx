// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { MenuItemProps, PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import Select, { SelectOption } from '../controls/Select';
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

function SqlPage(props: PageProps) {
    const params = useParams();
    const [dbTable, setDbTable] = useState("");
    const [sqlConnection, setSqlConnection] = useState<SqlType | undefined | void | "">(undefined);
    const [tabIndex, setTabIndex] = useState<number>(0);

    const StyledBreadcrumbs = styled(Breadcrumbs)({
        '.MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap'
        }
    });

    async function loadTables(): Promise<MenuItemProps[]> {
        if (!sqlConnection) {
            return new Promise((resolve) => resolve([]));
        }
        let tables: string[] = [];
        const results = await sqlConnection.runCommand("EXECUTE_QUERY", ["SELECT tablename FROM system.tables where type = 'TABLE' and schema = '" + sqlConnection.getDefaultSchema() + "'"]);
        if (results.error) {
            Toast.show(results.error, results);
            setDbTable("");
        }
        else if (results.rows) {
            tables = results.rows.map(row => row.values[0]);
        }
        if (!tables.includes(dbTable)) {
            if (tables.length > 0) {
                setDbTable(tables[0]);
            }
            else {
                setDbTable("");
            }
        }
        return new Promise((resolve) => resolve(tables.map(table => { return { id: table, label: table, onClick: () => { setDbTable(table) } } })));
    }

    function renderTabs(dbTable: string) {
        if (!sqlConnection) {
            return null;
        }
        let tabs = [];
        if (dbTable) {
            tabs.push(<Tab id="browse" label={t("form.sqleditor.label.tab.browse")}><SqlBrowseTab sqlConnection={sqlConnection} table={dbTable} /></Tab>);
        }
        tabs.push(<Tab id="query" label={t("form.sqleditor.label.tab.query")}><SqlQueryTab sqlConnection={sqlConnection} dbTable={dbTable} /></Tab>);
        return <Tabs currentTab={tabIndex} setCurrentTab={(tabIndex) => setTabIndex(tabIndex)}>{tabs}</Tabs>
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
        {sqlConnection ? renderTabs(dbTable) : <SqlLogin setSqlConnection={(conn: SqlType) => {
            setSqlConnection(conn);
        }} />}
    </PageLayout>;
}

export default withTranslation()(SqlPage);
