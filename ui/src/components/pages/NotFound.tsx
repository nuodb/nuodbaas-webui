// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";

/**
 *
 * @returns Returns "Not Found" page
 */
function NotFound(props: PageProps) {
    return <PageLayout {...props}>
        <h1>Not Found</h1>
    </PageLayout>;
}

export default withTranslation()(NotFound);