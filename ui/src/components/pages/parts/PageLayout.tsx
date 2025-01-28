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
    const { schema, children, isRecording } = props;
    const [showMenu, setShowMenu] = useState(true);
    const style = showMenu ? {} : { opacity: 0, left: -200, width: 0, padding: 0 };
    return <div className="NuoPageLayout">
        {<LeftMenu style={style} {...props} />}
        <div className="NuoPageLayoutMenuSeparator">
            <button onClick={() => {
                setShowMenu(!showMenu);
            }}>
                {showMenu ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </button>
        </div>
        <div className="NuoColumn">
            <div>{schema && <Banner schema={schema} isRecording={isRecording} />}</div>
            <div>{children}</div>
        </div>
    </div>
}
