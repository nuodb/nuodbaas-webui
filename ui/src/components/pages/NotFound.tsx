// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useNavigate } from "react-router-dom";
import { PageProps } from "../../utils/types";
import Button from "../controls/Button";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";

/**
 *
 * @returns Returns "Not Found" page
 */
function NotFound(props: PageProps) {
    const navigate = useNavigate();
    return <PageLayout {...props}>
        <h1 data-testid="not-found-header">Not Found</h1>
        <Button data-testid="button.ok" onClick={() => {
            navigate("/ui");
        }}>{props.t("button.dismiss")}</Button>
    </PageLayout>;
}

export default withTranslation()(NotFound);