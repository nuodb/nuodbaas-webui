import React from "react";
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
