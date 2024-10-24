// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React, { ReactNode } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { Accordion as MuiAccordion, AccordionDetails as MuiAccordionDetails, AccordionSummary as MuiAccordionSummary } from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

type AccordionProps = {
    "data-testid"?: string,
    key?: string,
    summary: string,
    children: ReactNode,
    className?: string,
    defaultExpanded?: boolean,
}

export default function Accordion(props: AccordionProps): JSX.Element {
    if (isMaterial()) {
        return <MuiAccordion className="advancedCard" defaultExpanded={props.defaultExpanded}>
            <MuiAccordionSummary data-testid={props["data-testid"]} className={props.className} expandIcon={<ArrowDropDownIcon />}>{props.summary}</MuiAccordionSummary>
            <MuiAccordionDetails>
                {props.children}
            </MuiAccordionDetails>
        </MuiAccordion>;
    }
    else {
        return <details>
            <summary data-testid={props["data-testid"]}>{props.summary}</summary>
            {props.children}
        </details>
    }
}
