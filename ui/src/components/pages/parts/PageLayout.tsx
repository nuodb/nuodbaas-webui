// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from 'react';
import LeftMenu from './LeftMenu';
import Banner from './Banner';
import { PageProps } from '../../../utils/types';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface PageLayoutProps extends PageProps {
    children: React.ReactNode;
}

export default function PageLayout(props: PageLayoutProps) {
    const HIDE_TOC = "nuodbaas-webui-hideTOC";
    const { schema, children, isRecording } = props;
    const [showMenu, setShowMenu] = useState(localStorage.getItem(HIDE_TOC) !== "true");
    return <div className="NuoPageLayout">
        <div className="NuoRowFixed NuoForDesktop">
            {<LeftMenu className={showMenu ? "NuoLeftMenu" : "NuoLeftMenuCollapsed"} {...props} />}
            <div className="NuoPageLayoutMenuSeparator">
                <button onClick={(event) => {
                    event.preventDefault();
                    localStorage.setItem(HIDE_TOC, String(showMenu));
                    setShowMenu(!showMenu);
                }}>
                    {showMenu ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </button>
            </div>
        </div>
        <div className="NuoColumn NuoContainerLG">
            <div>{schema && <Banner {...props} isRecording={isRecording} />}</div>
            <div>{children}</div>
        </div>
    </div>
}
