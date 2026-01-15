// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { useSearchParams, useNavigate } from "react-router-dom";
import Button from "../controls/Button";
import PageLayout from "./parts/PageLayout";
import { PageProps } from "../../utils/types";
import { withTranslation } from "react-i18next";

function ErrorPage(props: PageProps) {
    const navigate = useNavigate();
    let [searchParams] = useSearchParams();
    return (
        <PageLayout {...props}>
            <div className="NuoTableNoData">
                <h1>Error occurred</h1>
                <div>{searchParams.get("msg") || "Unknown Error occurred"}</div>
                <Button onClick={() => {
                    navigate("/ui");
                }}>{props.t("button.dismiss")}</Button>
            </div>
        </PageLayout>
    );
}

export default withTranslation()(ErrorPage)