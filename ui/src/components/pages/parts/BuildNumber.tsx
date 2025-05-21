// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

type BuildNumberProps = {
    className?: string
}
export default function BuildNumber({ className }: BuildNumberProps) {
    return <div className={className}>
        Build:&nbsp;
        {import.meta.env.REACT_APP_GIT_SHA && import.meta.env.REACT_APP_GIT_SHA}
        &nbsp;/&nbsp;
        {BUILD_DATE}
    </div>
}