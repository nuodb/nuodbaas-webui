// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import { useParams } from "react-router"
import { PageProps } from "../../utils/types";
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

function SqlPage(props: PageProps) {
    const params = useParams();
    const [dbTable, setDbTable] = useState("");
    const [dbTables, setDbTables] = useState<string[]>([]);
    const [sqlConnection, setSqlConnection] = useState<SqlType | undefined | void | "">(undefined);
    const [tabIndex, setTabIndex] = useState<number>(0);

    const StyledBreadcrumbs = styled(Breadcrumbs)({
        '.MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap'
        }
    });

    async function refreshTables(s: SqlType) {
        const results = await s.runCommand("EXECUTE_QUERY", ["SELECT tablename FROM system.tables where type = 'TABLE'"]);
        if (results.error) {
            Toast.show(results.error, results);
            setDbTables([]);
            setDbTable("");
        }
        else {
            const tables = results.rows?.map(row => row.values[0]) || [];
            setDbTables(tables);
            setDbTable(tables.length > 0 ? tables[0] : "");
        }
    }

    function renderTabs(dbTable: string) {
        if (!sqlConnection) {
            return null;
        }
        let tabs = [];
        if (dbTable) {
            tabs.push(<Tab id="browse" label="Browse"><SqlBrowseTab sqlConnection={sqlConnection} table={dbTable} /></Tab>);
        }
        tabs.push(<Tab id="query" label="Query"><SqlQueryTab sqlConnection={sqlConnection} dbTable={dbTable} /></Tab>);
        return <Tabs currentTab={tabIndex} setCurrentTab={(tabIndex) => setTabIndex(tabIndex)}>{tabs}</Tabs>
    }

    return <PageLayout {...props}>
        <div className="NuoListResourceHeader">
            <h3>SQL Editor</h3>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <StyledBreadcrumbs data-testid="path_component" separator=">" aria-label="resources" style={{ color: "#b5b9bc", fontSize: "1em", padding: "0 20px", display: "flex", flexWrap: "nowrap" }}>
                    {[params.organization, params.project, params.database].map(name => {
                        return <Typography color="text.primary" style={{ fontSize: "1em", textWrap: "nowrap" }}>{name}</Typography>
                    })}
                    {dbTables.length > 0 && <Select id="filter" label="" value={dbTable} onChange={({ target }) => {
                        setDbTable(target.value);
                    }}>
                        {dbTables.map((table: string) => <SelectOption key={table} value={table}>{table}</SelectOption>)}
                    </Select>}
                </StyledBreadcrumbs>
            </div>
        </div>
        {sqlConnection ? renderTabs(dbTable) : <SqlLogin setSqlConnection={(conn: SqlType) => {
            setSqlConnection(conn);
            refreshTables(conn);
        }} />}
    </PageLayout>;
}

export default withTranslation()(SqlPage);
