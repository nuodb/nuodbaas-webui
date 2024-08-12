import React from "react";
import Path from "./parts/Path";

export default function Home({schema}) {
    return (
        <Path schema={schema} path="Home" filterValues={[]} />
    );
}
