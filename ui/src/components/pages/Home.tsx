// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Path from "./parts/Path";
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";

function Home(props: PageProps) {
    return <PageLayout {...props}>
        <Path schema={props.schema} path="Home" filterValues={[]} />
    </PageLayout>;
}

export default withTranslation()(Home);