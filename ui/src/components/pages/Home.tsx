// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Path from "./parts/Path";
import { SchemaType } from "../../utils/types";

interface Props {
    schema: SchemaType
}

export default function Home({ schema }: Props) {
    return (
        <Path schema={schema} path="Home" filterValues={[]} />
    );
}
