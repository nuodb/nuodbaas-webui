// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useSearchParams, useNavigate } from "react-router-dom";
import Button from "../controls/Button";
import PageLayout from "./parts/PageLayout";
import { PageProps } from "../../utils/types";
import { withTranslation } from "react-i18next";

function ErrorPage(props: PageProps) {
    const navigate = useNavigate();
    let [searchParams] = useSearchParams();

    if (searchParams.get("crashme") === "true") {
        throw new Error("Simulate crash");
    }

    return (
        <PageLayout {...props}>
            <div className="NuoTableNoData">
                <h1 data-testid="error-page-title">Error occurred</h1>
                <div data-testid="error-page-message">{searchParams.get("msg") || "Unknown Error occurred"}</div>
                <Button data-testid="button.ok" onClick={() => {
                    navigate("/ui");
                }}>{props.t("button.dismiss")}</Button>
            </div>
        </PageLayout>
    );
}

export default withTranslation()(ErrorPage)