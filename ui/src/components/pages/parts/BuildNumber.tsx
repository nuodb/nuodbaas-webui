// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import preval from 'preval.macro'

type BuildNumberProps = {
    className?: string
}
export default function BuildNumber({ className }: BuildNumberProps) {
    return <div className={className}>
        Build:&nbsp;
        {process.env.REACT_APP_GIT_SHA && process.env.REACT_APP_GIT_SHA}
        &nbsp;/&nbsp;
        {preval`module.exports = new Date().toISOString();`}
    </div>
}