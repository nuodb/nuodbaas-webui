// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import Path from "./parts/Path";
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";

function OrganizationOverview(props: PageProps) {
    return <PageLayout {...props}>
        <Path schema={props.schema} path="Organization Overview" filterValues={[]} />
    </PageLayout>;
}

export default withTranslation()(OrganizationOverview);